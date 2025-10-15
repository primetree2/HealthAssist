import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
default_db_path = os.path.join(BASE_DIR, "HealthAssist.db")


DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")


if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)



connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


from . import models
Base.metadata.create_all(bind=engine)