import hashlib
import os
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
REVISION = "7ae557604adf67be50417f59c2c2f167def9a775"
GENERATION = {"do_sample": False, "max_new_tokens": 192}

def load_model(source=MODEL, adapter=None, precision=None):
    torch.set_num_threads(int(os.getenv("MIRROR_THREADS", "4")))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    precision = precision or ("bfloat16" if device == "cuda" and torch.cuda.is_bf16_supported() else "float32")
    revision = None if Path(source).is_dir() else REVISION if source == MODEL else None
    tokenizer = AutoTokenizer.from_pretrained(source, revision=revision, padding_side="left")
    model = AutoModelForCausalLM.from_pretrained(source, revision=revision, torch_dtype=getattr(torch, precision)).to(device)
    if adapter:
        model = PeftModel.from_pretrained(model, adapter)
    return tokenizer, model.eval()

def infer(tokenizer, model, conversations, max_new_tokens=192):
    text = tokenizer.apply_chat_template(conversations, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt", padding=True, add_special_tokens=False).to(model.device)
    with torch.inference_mode():
        output = model.generate(**inputs, do_sample=False, max_new_tokens=max_new_tokens, pad_token_id=tokenizer.pad_token_id)
    return tokenizer.batch_decode(output[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)

def runtime(model):
    return {"torch": torch.__version__, "device": str(model.device), "dtype": str(model.dtype)}

def adapter_digest(directory):
    return hashlib.sha256((Path(directory) / "adapter_model.safetensors").read_bytes()).hexdigest()
