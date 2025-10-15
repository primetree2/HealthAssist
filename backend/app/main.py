# HealthAssist/backend/app/main.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from . import utils, crud
from fastapi.responses import JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/api/analyze")
async def analyze(
    age: int = Form(None),
    sex: str = Form(None),
    symptoms: str = Form(""),
    file: UploadFile = File(None)
):
    """
    Accepts form fields: age, sex, symptoms and an optional PDF file.
    Calls utils to extract PDF text (if present) and the LLM wrapper, then saves to DB.
    """
    pdf_text = ""
    if file:
        try:
            pdf_bytes = await file.read()
            pdf_text = utils.extract_text_from_pdf(pdf_bytes)
        except Exception as e:
            print("PDF read/extract error:", e)
            pdf_text = ""

    llm_json = utils.call_llm(age or 0, sex or "", symptoms or "", pdf_text or "")

    try:
        crud.create_history(
            age=age,
            sex=sex,
            symptoms=symptoms,
            pdf_summary=pdf_text,
            result=llm_json
        )
    except Exception as e:
        print("DB save error:", e)

    return JSONResponse(content=llm_json)

@app.get("/api/history")
async def get_history():
    return crud.get_history()
