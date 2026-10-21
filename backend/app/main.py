import asyncio
import os
from functools import partial
import logging
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from .cloud import CloudUnavailable, cloud_ready, explain_analysis
from .extraction import ExtractionError, MAX_FILE, extract
from .interpretation import build_analysis
from .models import Analysis, ExtractionInfo, PatientContext, ReviewRequest
from .parsing import ParseAccumulator, deduplicate, parse_text
from .security import SecurityMiddleware, check_rate, shared_ready

app = FastAPI(
    title="HealthAssist",
    version="2.0.0",
    docs_url=None if os.getenv("VERCEL") else "/api/docs",
    redoc_url=None,
    openapi_url=None if os.getenv("VERCEL") else "/api/openapi.json",
)
app.add_middleware(SecurityMiddleware)
WORKERS = asyncio.Semaphore(3)
logger = logging.getLogger("healthassist")


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse(
        {"error": {"code": "request_rejected", "message": str(exc.detail)}},
        exc.status_code,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Never echo submitted medical content back inside framework errors.
    return JSONResponse(
        {
            "error": {
                "code": "invalid_input",
                "message": "Some fields are invalid or exceed their allowed length. Check the report and context, then retry.",
            }
        },
        422,
    )


@app.exception_handler(ExtractionError)
async def extraction_error(request, exc):
    return JSONResponse({"error": {"code": exc.code, "message": str(exc)}}, exc.status)


@app.exception_handler(CloudUnavailable)
async def cloud_error(request, exc):
    return JSONResponse(
        {"error": {"code": "cloud_unavailable", "message": str(exc)}}, 503
    )


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    logger.error(
        "request_failed type=%s", type(exc).__name__
    )  # no medical content, exception text, or credentials
    return JSONResponse(
        {
            "error": {
                "code": "internal_error",
                "message": "The report could not be processed safely. Try another format or contact support with the response request ID.",
            }
        },
        500,
    )


@app.get("/api/health")
def health():
    available = cloud_ready() and (not os.getenv("VERCEL") or shared_ready())
    return {
        "status": "ok",
        "version": "2.0.0",
        "cloud_available": available,
        "max_file_bytes": MAX_FILE,
        "max_pdf_pages": 15,
        "history": "not_stored_on_server",
        "rate_limit": "shared" if shared_ready() else "best_effort_per_instance",
        "formats": [
            "pdf",
            "png",
            "jpg",
            "webp",
            "txt",
            "csv",
            "tsv",
            "json",
            "xlsx",
            "docx",
        ],
    }


async def maybe_explain(analysis, explain, allow_cloud):
    if not explain:
        return analysis
    if not allow_cloud:
        raise HTTPException(
            422, "Explicit cloud consent is required for AI explanations."
        )
    try:
        # The result is useful even when a provider is unavailable; failure is explicit, not clinical content.
        analysis.ai = await run_in_threadpool(explain_analysis, analysis)
        analysis.ai_status = "generated"
    except CloudUnavailable as exc:
        analysis.ai_status = "unavailable"
        analysis.ai_notice = str(exc)
    return analysis


@app.post("/api/analyze", response_model=Analysis)
async def analyze(
    request: Request,
    file: UploadFile | None = File(None),
    pasted_text: str = Form("", max_length=20000),
    symptoms: str = Form("", max_length=4000),
    context: str = Form("{}", max_length=3000),
    consent_processing: bool = Form(False),
    allow_cloud: bool = Form(False),
    explain: bool = Form(False),
):
    if not consent_processing:
        raise HTTPException(
            422, "Consent to process the submitted report and context is required."
        )
    if explain and not allow_cloud:
        raise HTTPException(422, "Cloud consent is required for AI explanations.")
    try:
        patient = PatientContext.model_validate_json(context)
    except (ValidationError, ValueError):
        raise HTTPException(
            422,
            "Patient context is invalid. Age must be 0–120 and options must match the form.",
        )
    if file and pasted_text.strip():
        raise HTTPException(422, "Submit a file or pasted report text, not both.")
    if not file and not pasted_text.strip() and not symptoms.strip():
        raise HTTPException(
            422, "Add a report, pasted results, or symptoms before analyzing."
        )
    await check_rate(request, cloud=allow_cloud)
    async with WORKERS:
        if file:
            try:
                chunks = []
                size = 0
                while chunk := await file.read(256_000):
                    size += len(chunk)
                    if size > MAX_FILE:
                        raise ExtractionError(
                            "Files must be 4 MB or smaller.", status=413
                        )
                    chunks.append(chunk)
                raws, info = await run_in_threadpool(
                    partial(
                        extract,
                        b"".join(chunks),
                        file.filename or "report",
                        allow_cloud,
                    )
                )
            finally:
                await file.close()
        elif pasted_text.strip():
            acc = ParseAccumulator()
            parse_text(pasted_text, acc)
            raws = deduplicate(acc.items)
            info = ExtractionInfo(
                format="pasted text",
                methods=["Anchored text + column parsing"],
                warnings=acc.warnings,
                ignored_line_count=acc.ignored,
                unparsed_lines=acc.unparsed,
            )
        else:
            raws = []
            info = ExtractionInfo(format="symptoms only", methods=["User context"])
        analysis = build_analysis(raws, patient, symptoms.strip(), info)
        return await maybe_explain(analysis, explain, allow_cloud)


@app.post("/api/review", response_model=Analysis)
async def review(body: ReviewRequest, request: Request):
    if not body.consent_processing:
        raise HTTPException(422, "Processing consent is required.")
    if body.explain and not body.allow_cloud:
        raise HTTPException(422, "Cloud consent is required for AI explanations.")
    if not body.observations and not body.symptoms.strip():
        raise HTTPException(422, "No observations or symptoms were supplied.")
    await check_rate(request, cloud=body.explain)
    async with WORKERS:
        analysis = build_analysis(body.observations, body.context, body.symptoms)
        return await maybe_explain(analysis, body.explain, body.allow_cloud)
