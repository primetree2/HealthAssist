# HealthAssist/backend/app/models.py
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from .db import Base

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)
    symptoms = Column(Text, nullable=True)
    pdf_summary = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=False), server_default=func.now())
