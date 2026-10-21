"""Prevent static cleanup from removing Vercel's ASGI application export."""


def test_vercel_entrypoint_exports_backend_application():
    from api.index import app
    from backend.app.main import app as backend_app

    assert app is backend_app
    assert callable(app)
