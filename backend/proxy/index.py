"""
Прокси-функция: перенаправляет все запросы от фронтенда к FastAPI-серверу на 72.56.35.26:8000.
Решает проблему Mixed Content (HTTPS сайт → HTTP сервер).
Поддерживает JSON, form-data и бинарные (base64) тела.
"""

import json
import os
import base64
import urllib.request
import urllib.error
import urllib.parse

TARGET = os.environ.get("FASTAPI_URL", "http://72.56.35.26:8000")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = (event.get("queryStringParameters") or {}).get("path", "/")

    url = TARGET.rstrip("/") + "/" + path.lstrip("/")

    qs = {k: v for k, v in (event.get("queryStringParameters") or {}).items() if k != "path"}
    if qs:
        url += "?" + urllib.parse.urlencode(qs)

    # Заголовки — передаём Content-Type как есть
    req_headers = {}
    incoming_headers = event.get("headers") or {}
    content_type = (
        incoming_headers.get("content-type")
        or incoming_headers.get("Content-Type")
        or ""
    )
    if content_type:
        req_headers["Content-Type"] = content_type

    # Тело: base64 или строка
    body_raw = event.get("body") or ""
    if event.get("isBase64Encoded") and body_raw:
        body_bytes = base64.b64decode(body_raw)
    elif isinstance(body_raw, str):
        body_bytes = body_raw.encode("utf-8")
    else:
        body_bytes = body_raw

    req = urllib.request.Request(
        url,
        data=body_bytes if body_bytes else None,
        headers=req_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            resp_body = resp.read()
            resp_ct = resp.headers.get("Content-Type", "application/json")
            return {
                "statusCode": resp.status,
                "headers": {**CORS, "Content-Type": resp_ct},
                "body": resp_body.decode("utf-8", errors="replace"),
            }
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {
            "statusCode": e.code,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": body,
        }
    except Exception as e:
        return {
            "statusCode": 502,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)}),
        }
