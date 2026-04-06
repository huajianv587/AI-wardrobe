from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_options = {"future": True, "pool_pre_ping": not is_sqlite}

if connect_args:
    engine_options["connect_args"] = connect_args

engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
