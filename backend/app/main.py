# HealthAssist/backend/app/main.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from . import utils, crud

app = FastAPI(title="HealthAssist API")


origins = [
    "http://localhost:5173",
    "https://health-assist-rose.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze(
    age: int = Form(None),
    sex: str = Form(None),
    symptoms: str = Form(""),
    file: UploadFile = File(None)
):
    """
    Accepts form fields and an optional PDF file, returning a structured JSON analysis.
    """
    pdf_text = ""
    if file:
        if file.content_type != 'application/pdf':
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")
        try:
            pdf_bytes = await file.read()

            pdf_text = await run_in_threadpool(utils.extract_text_from_pdf, pdf_bytes)
        except Exception as e:

            raise HTTPException(status_code=500, detail=f"Error processing PDF file: {e}")

    try:

        llm_json = await run_in_threadpool(
            utils.call_llm, age or 0, sex or "", symptoms or "", pdf_text or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling AI model: {e}")


    try:

        await run_in_threadpool(
            crud.create_history,
            age=age,
            sex=sex,
            symptoms=symptoms,
            pdf_summary=pdf_text,
            result=llm_json
        )
    except Exception as e:

        print(f"CRITICAL: Failed to save analysis to database. Error: {e}")

    return JSONResponse(content=llm_json)


@app.get("/api/history")
async def get_history():
    """
    Retrieves the analysis history from the database.
    """
    try:

        history = await run_in_threadpool(crud.get_history)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {e}")