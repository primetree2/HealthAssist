import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.security import LOCAL_WINDOWS


@pytest.fixture(autouse=True)
def isolated_limits(monkeypatch):
    LOCAL_WINDOWS.clear()
    for key in [
        "VERCEL",
        "GOOGLE_API_KEY",
        "GEMINI_MODEL",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "RATE_LIMIT_SALT",
    ]:
        monkeypatch.delenv(key, raising=False)
    yield
    LOCAL_WINDOWS.clear()
