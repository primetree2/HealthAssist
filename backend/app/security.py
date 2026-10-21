"""Bounded body handling, safe responses, and shared fixed-window rate limiting."""

import asyncio
import hashlib
import hmac
import os
import time
import uuid
from collections import OrderedDict
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException, Request
from starlette.responses import JSONResponse

MAX_BODY = 4_300_000
LOCAL_WINDOWS = OrderedDict()
LOCK = asyncio.Lock()


class SecurityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        request_id = str(uuid.uuid4())
        headers = dict(scope.get("headers", []))
        is_api = scope["path"].startswith("/api")

        async def safe_send(message):
            if message["type"] == "http.response.start":
                h = list(message.get("headers", []))
                h.extend(
                    [
                        (b"x-content-type-options", b"nosniff"),
                        (b"referrer-policy", b"no-referrer"),
                        (b"x-frame-options", b"DENY"),
                        (b"x-request-id", request_id.encode()),
                    ]
                )
                if is_api:
                    h.extend(
                        [(b"cache-control", b"no-store"), (b"pragma", b"no-cache")]
                    )
                message["headers"] = h
            await send(message)

        if scope["method"] in ("POST", "PUT", "PATCH"):
            try:
                declared = int(headers.get(b"content-length", b"0"))
            except ValueError:
                declared = MAX_BODY + 1
            if declared < 0 or declared > MAX_BODY:
                return await JSONResponse(
                    {
                        "error": {
                            "code": "payload_too_large",
                            "message": "Request exceeds the 4 MB file / 4.3 MB request limit.",
                        }
                    },
                    413,
                )(scope, receive, safe_send)
            # Enforce even when Content-Length is missing/chunked, BEFORE multipart parsing.
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > MAX_BODY:
                    return await JSONResponse(
                        {
                            "error": {
                                "code": "payload_too_large",
                                "message": "Request body is too large.",
                            }
                        },
                        413,
                    )(scope, receive, safe_send)
                if not message.get("more_body", False):
                    break
            replayed = False

            async def replay():
                nonlocal replayed
                if not replayed:
                    replayed = True
                    return {
                        "type": "http.request",
                        "body": bytes(body),
                        "more_body": False,
                    }
                return await receive()

            await self.app(scope, replay, safe_send)
        else:
            await self.app(scope, receive, safe_send)


def shared_ready():
    return bool(
        os.getenv("UPSTASH_REDIS_REST_URL")
        and os.getenv("UPSTASH_REDIS_REST_TOKEN")
        and os.getenv("RATE_LIMIT_SALT")
    )


def identity(request: Request):
    # Vercel owns x-vercel-forwarded-for; locally do not trust arbitrary forwarding headers.
    address = (
        request.headers.get("x-vercel-forwarded-for", "").split(",")[0].strip()
        if os.getenv("VERCEL")
        else ""
    )
    address = address or (request.client.host if request.client else "unknown")
    salt = os.getenv("RATE_LIMIT_SALT", "development-not-for-distributed-rate-limiting")
    return hmac.new(salt.encode(), address.encode(), hashlib.sha256).hexdigest()[:32]


async def count_window(key, seconds):
    if shared_ready():
        url = os.environ["UPSTASH_REDIS_REST_URL"].rstrip("/")
        if urlparse(url).scheme != "https":
            raise HTTPException(503, "Rate limiting is misconfigured.")
        script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n"
        try:
            async with httpx.AsyncClient(timeout=4.0, follow_redirects=False) as client:
                result = await client.post(
                    url,
                    headers={
                        "Authorization": "Bearer "
                        + os.environ["UPSTASH_REDIS_REST_TOKEN"]
                    },
                    json=["EVAL", script, "1", "healthassist:" + key, str(seconds)],
                )
                result.raise_for_status()
                n = result.json()["result"]
                if isinstance(n, bool) or not isinstance(n, int):
                    raise ValueError()
                return n
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise HTTPException(
                503,
                "The shared request limiter is unavailable. Please try again later.",
            )
    async with LOCK:
        now = time.monotonic()
        for k in list(LOCAL_WINDOWS):
            if LOCAL_WINDOWS[k][1] <= now:
                LOCAL_WINDOWS.pop(k, None)
        n, expiry = LOCAL_WINDOWS.get(key, (0, now + seconds))
        LOCAL_WINDOWS[key] = (n + 1, expiry)
        LOCAL_WINDOWS.move_to_end(key)
        while len(LOCAL_WINDOWS) > 2048:
            LOCAL_WINDOWS.popitem(last=False)
        return n + 1


async def check_rate(request: Request, cloud=False):
    n = await count_window("request:" + identity(request), 60)
    if n > 12:
        raise HTTPException(
            429,
            "Too many analyses. Wait a minute before trying again.",
            headers={"Retry-After": "60"},
        )
    if cloud:
        if os.getenv("VERCEL") and not shared_ready():
            raise HTTPException(
                503, "Cloud processing requires a configured shared rate limiter."
            )
        # Fail closed for cloud spend. A rolling 24-hour window is shared across all clients.
        limit = int(os.getenv("CLOUD_DAILY_REQUEST_LIMIT", "100"))
        n = await count_window("cloud-budget", 86400)
        if n > max(1, min(limit, 10000)):
            raise HTTPException(
                429,
                "The cloud processing allowance has been reached. Use local extraction or try later.",
            )
