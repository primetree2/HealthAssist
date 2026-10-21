"""Vercel ASGI entrypoint; the explicit re-export must remain available."""

from backend.app.main import app as app
