from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from typing import Optional
from . import utils

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


SESSION_HISTORY = {}

@app.post("/api/analyze")
async def analyze(
    age: int = Form(None),
    sex: str = Form(None),
    symptoms: str = Form(""),
    file: UploadFile = File(None),
    x_session_id: Optional[str] = Header(None)
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID header missing")

    pdf_text = ""
    if file:
        # ... (PDF processing logic remains the same)
        pdf_bytes = await file.read()
        pdf_text = await run_in_threadpool(utils.extract_text_from_pdf, pdf_bytes)

    # Get the analysis from the LLM
    llm_json = await run_in_threadpool(
        utils.call_llm, age or 0, sex or "", symptoms or "", pdf_text or ""
    )


    user_history = SESSION_HISTORY.get(x_session_id, [])
    

    user_history.insert(0, {
        "age": age,
        "sex": sex,
        "symptoms": symptoms,
        "result": llm_json
    })
    

    SESSION_HISTORY[x_session_id] = user_history

    return JSONResponse(content=llm_json)


@app.get("/api/history")
async def get_history(
    response: Response,
    x_session_id: Optional[str] = Header(None)
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID header missing")


    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    

    user_history = SESSION_HISTORY.get(x_session_id, [])
    
    return user_history