"""FastAPI service for user-owned local inference or approved OpenAI-compatible APIs."""
import json
import os
import sqlite3
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Literal
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr

from mirror.model import GENERATION, MODEL, REVISION, adapter_digest, infer, load_model, runtime
from mirror.protocol import run_definition

app = FastAPI(title="The Mirror", version="1.0.0")
origins = os.getenv("MIRROR_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in origins.split(",") if x.strip()], allow_methods=["POST","GET"], allow_headers=["Content-Type"])
model_lock = Lock()

class Provider(BaseModel):
    endpoint: str = Field(min_length=1, max_length=500)
    key: SecretStr = SecretStr("")
    model: str = Field(min_length=1, max_length=200)

class Definition(BaseModel):
    language: Literal["zh","en"]
    mode: Literal["perspective","pressure","evidence","blind"]
    variant: Literal["base","prompted","lora","api"]
    question: str = Field(min_length=1, max_length=2500)
    a: str = Field(min_length=1, max_length=1500)
    b: str = Field(min_length=1, max_length=1500)
    labels: list[str] = Field(min_length=3, max_length=3)
    preset: str | None = Field(default=None, max_length=50)
    expected: list[str] | None = Field(default=None, min_length=3, max_length=3)
    api: Provider | None = None

@lru_cache(maxsize=1)
def engine():
    return load_model(os.getenv("MIRROR_MODEL", MODEL), precision=os.getenv("MIRROR_PRECISION"))

@lru_cache(maxsize=1)
def lora_engine():
    from peft import PeftModel
    from copy import deepcopy
    tokenizer, base = engine()
    folder = Path(os.getenv("MIRROR_ADAPTER", "research/adapter"))
    if not (folder / "adapter_config.json").is_file():
        raise HTTPException(503, "LoRA adapter unavailable. Configure MIRROR_ADAPTER.")
    return tokenizer, PeftModel.from_pretrained(deepcopy(base), folder).eval()

def persist(record):
    db = Path(os.getenv("MIRROR_DB", "runs/experiments.sqlite"))
    db.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db, timeout=15) as con:
        con.execute("CREATE TABLE IF NOT EXISTS experiments (id TEXT PRIMARY KEY, recorded_at TEXT, record TEXT)")
        con.execute("INSERT INTO experiments VALUES (?,?,?)",
                    (record["id"], record["time"], json.dumps(record, ensure_ascii=False)))

def provider_call(definition, provider):
    endpoint = provider.endpoint.strip().rstrip("/")
    trusted = {x.strip().rstrip("/") for x in os.getenv("MIRROR_API_ENDPOINTS","https://api.openai.com/v1").split(",")}
    parts = urlsplit(endpoint)
    if endpoint not in trusted or parts.scheme not in ("https","http") or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
        raise HTTPException(422, "API URL is not listed in the FastAPI server’s MIRROR_API_ENDPOINTS.")
    key = provider.key.get_secret_value()
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    params = {"temperature": 0, "max_tokens": 192}
    response_models = set()
    with httpx.Client(timeout=65, follow_redirects=False) as client:
        def call(conversations):
            answers = []
            for messages in conversations:
                try:
                    reply = client.post(f"{endpoint}/chat/completions", headers=headers,
                                        json={"model": provider.model, "messages":messages, **params})
                    reply.raise_for_status()
                    data = reply.json()
                    text = data["choices"][0]["message"]["content"]
                    if not isinstance(text,str):
                        raise ValueError("Provider did not return text")
                    response_models.add(str(data.get("model") or provider.model))
                    answers.append(text)
                except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
                    status = f" (HTTP {exc.response.status_code})" if isinstance(exc, httpx.HTTPStatusError) else ""
                    raise HTTPException(502, f"API provider failed{status}. Check the model and provider settings.") from exc
            return answers
        result = run_definition(definition, call, provider.model, params, "live")
    result["runtime"] = {"provider":parts.hostname, "reported_models":sorted(response_models)}
    return result

@app.get("/health")
def health():
    return {"status":"ok","model":MODEL,"revision":REVISION}

@app.post("/v1/experiment")
def experiment(request: Definition):
    if not all(x.strip() for x in (request.question,request.a,request.b)):
        raise HTTPException(422, "Provide the question and two comparison conditions.")
    definition = request.model_dump(exclude={"api"})
    if request.variant == "api":
        if request.api is None:
            raise HTTPException(422, "Configure the API provider first.")
        result = provider_call(definition, request.api)
    else:
        with model_lock:
            tokenizer, model = lora_engine() if request.variant == "lora" else engine()
            source = os.getenv("MIRROR_MODEL", MODEL)
            params = GENERATION | {"revision": REVISION if source == MODEL else os.getenv("MIRROR_MODEL_REVISION")}
            if request.variant == "lora":
                params["adapter_sha256"] = adapter_digest(os.getenv("MIRROR_ADAPTER", "research/adapter"))
            result = run_definition(definition, lambda batch: infer(tokenizer,model,batch,params["max_new_tokens"]),
                                    os.getenv("MIRROR_MODEL_NAME", MODEL if source == MODEL else model.config._name_or_path),
                                    params, "live", runtime(model))
    persist(result)
    return result
