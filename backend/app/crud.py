# HealthAssist/backend/app/crud.py
from .db import SessionLocal
from .models import History
import json
from datetime import datetime

def create_history(age=None, sex=None, symptoms=None, pdf_summary=None, result=None):
    """
    Creates a history row. `result` is typically a dict (LLM output) and will be stored as JSON text.
    Returns the SQLAlchemy History instance (detached).
    """
    db = SessionLocal()
    try:
        
        if result is None:
            result_text = None
        elif isinstance(result, str):
            
            try:
               
                json.loads(result)
                result_text = result
            except Exception:
                result_text = json.dumps({"text": result})
        else:
            
            result_text = json.dumps(result)
        h = History(
            age=age,
            sex=sex,
            symptoms=symptoms,
            pdf_summary=pdf_summary,
            result=result_text
        )
        db.add(h)
        db.commit()
        db.refresh(h)
        return h
    finally:
        db.close()

def get_history(limit=50):
    """
    Returns a list of dicts representing recent history items (most recent first).
    Decodes JSON from `result` column if possible.
    """
    db = SessionLocal()

    
    try:
        items = db.query(History).order_by(History.timestamp.desc()).limit(limit).all()
        print(f"[DEBUG] {datetime.now()} - Found {len(items)} history items")
        out = []
        for i in items:
           
            print(f"   → ID {i.id}: {i.age}, {i.sex}, {i.symptoms}")
            decoded = None
            if i.result:
                try:
                    decoded = json.loads(i.result)
                except Exception:
                    decoded = i.result
            out.append({
                "id": i.id,
                "age": i.age,
                "sex": i.sex,
                "symptoms": i.symptoms,
                "pdf_summary": i.pdf_summary,
                "result": decoded,
                "timestamp": i.timestamp.isoformat() if i.timestamp else None
            })
        return out
    finally:
        db.close()
