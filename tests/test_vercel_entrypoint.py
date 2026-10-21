"""Prevent static cleanup from removing Vercel's ASGI application export."""


def test_vercel_entrypoint_exports_backend_application():
    from api.index import app
    from backend.app.main import app as backend_app

    assert app is backend_app
    assert callable(app)


def test_vercel_requirements_are_flat_and_match_runtime_lock():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    requirements = (root / "requirements.txt").read_text()
    assert requirements == (root / "requirements.lock").read_text()
    assert all(
        "==" in line and not line.startswith("-")
        for line in requirements.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )
