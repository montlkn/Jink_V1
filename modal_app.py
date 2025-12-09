import json
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import modal
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = modal.App(name="aesthetic-profile-summary")

# Build image with CLIP support for image matching
node_image = (
    modal.Image.debian_slim()
    .apt_install("nodejs", "npm")
    .pip_install(
        "fastapi",
        "requests",
        "httpx",
        "redis",
        "python-dotenv",
        "google-generativeai",
        "supabase>=2.4.1",
        "torch",
        "open_clip_torch",
        "pillow",
        "numpy",
    )
    .add_local_dir("apps/server", "/opt/server", copy=True)
    .run_commands("cd /opt/server && npm install --omit=dev")
)

# Secrets
SECRETS = [
    modal.Secret.from_name("GEMINI_API_KEY"),
    modal.Secret.from_name("SUPABASE_URL"),
    modal.Secret.from_name("SUPABASE_SERVICE_KEY"),
]


def _invoke_node(command: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Spawn Node subprocess and return parsed JSON result."""
    env = os.environ.copy()
    proc = subprocess.run(
        ["node", "/opt/server/bin/modal-entry.js", command],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        env=env,
    )

    stdout = (proc.stdout or "").strip()
    stderr = (proc.stderr or "").strip()

    if not stdout:
        return {"status": 500, "body": {"error": "Empty response", "stderr": stderr}}

    try:
        result = json.loads(stdout)
    except json.JSONDecodeError:
        return {"status": 500, "body": {"error": "Invalid JSON", "stdout": stdout, "stderr": stderr}}

    if proc.returncode != 0:
        result["body"]["stderr"] = stderr
        result["status"] = 500

    return result


fastapi_app = FastAPI()


@fastapi_app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


def _summary_response(result: Dict[str, Any]) -> JSONResponse:
    status = result.get("status", 500)
    body = result.get("body", result)
    return JSONResponse(body, status_code=status)


@fastapi_app.get("/v1/profile/summary")
@fastapi_app.post("/v1/profile/summary")
async def get_summary(request: Request):
    headers = dict(request.headers)
    auth_header = headers.get("authorization", "")
    params = request.query_params
    autogen_param = params.get("autogen", "false").lower() == "true"
    result = _invoke_node(
        "get-summary",
        {"authorization": auth_header, "autogen": autogen_param},
    )
    return _summary_response(result)


@fastapi_app.post("/v1/profile/summary/regenerate")
async def regenerate_summary(request: Request):
    headers = dict(request.headers)
    auth_header = headers.get("authorization", "")
    idem_key = headers.get("idempotency-key")
    result = _invoke_node(
        "regenerate-summary",
        {"authorization": auth_header, "idempotencyKey": idem_key},
    )
    return _summary_response(result)


@fastapi_app.get("/v1/profile/summary/meta")
async def get_summary_meta(request: Request):
    headers = dict(request.headers)
    auth_header = headers.get("authorization", "")
    result = _invoke_node(
        "get-summary-meta",
        {"authorization": auth_header},
    )
    return _summary_response(result)


@fastapi_app.post("/v1/contributions/upload")
async def upload_contribution(request: Request):
    headers = dict(request.headers)
    body = await request.json()
    auth_header = headers.get("authorization", "")
    
    result = _invoke_node(
        "upload-contribution",
        {
            "authorization": auth_header,
            "authId": body.get("user_id"), 
            "latitude": body.get("latitude"),
            "longitude": body.get("longitude"),
            "heading": body.get("heading"),
            "fov": body.get("fov"),
            "pitch": body.get("pitch"),
            "imagePath": body.get("image_path"),
            "userNotes": body.get("notes"),
        }
    )
    return _summary_response(result)


@app.function(image=node_image, secrets=SECRETS)
@modal.asgi_app()
def main():
    return fastapi_app


@app.function(image=node_image, secrets=SECRETS)
def debug_env():
    """Quick function to print loaded env vars."""
    print("FastAPI version:", os.popen("pip show fastapi | grep Version").read().strip())
    for key in ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GEMINI_API_KEY"]:
        val = os.environ.get(key)
        print(f"{key} = {'SET' if val else 'MISSING'}")
