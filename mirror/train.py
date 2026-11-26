"""Response-only LoRA SFT on the generated training split."""
import argparse
import json
import random
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model

from mirror.model import MODEL, REVISION, load_model, runtime

def train(args):
    if args.steps < 1 or args.batch_size < 1:
        raise ValueError("Steps and batch size must be positive")
    torch.manual_seed(args.seed)
    rng = random.Random(args.seed)
    tokenizer, base = load_model(args.model, precision=args.precision)
    model = get_peft_model(base, LoraConfig(
        r=8, lora_alpha=16, lora_dropout=0.0, target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM",
    ))
    model.train()
    model.config.use_cache = False
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=args.learning_rate)
    samples = [json.loads(line) for line in args.data.read_text().splitlines()]
    losses, seen = [], []
    for step in range(args.steps):
        batch = rng.sample(samples, args.batch_size)
        inputs, labels = [], []
        for row in batch:
            prefix = tokenizer.apply_chat_template(row["messages"], tokenize=True, add_generation_prompt=True)
            answer = tokenizer.encode(row["answer"] + "<|im_end|>", add_special_tokens=False)
            inputs.append(prefix + answer)
            labels.append([-100] * len(prefix) + answer)
        width = max(map(len, inputs))
        ids = torch.tensor([row + [tokenizer.pad_token_id] * (width - len(row)) for row in inputs], device=model.device)
        targets = torch.tensor([row + [-100] * (width - len(row)) for row in labels], device=model.device)
        mask = torch.tensor([[1] * len(row) + [0] * (width - len(row)) for row in inputs], device=model.device)
        optimizer.zero_grad(set_to_none=True)
        # Upcast for cross-entropy; only response positions contribute to the loss.
        hidden = model.base_model.model.model(input_ids=ids, attention_mask=mask, use_cache=False).last_hidden_state
        active = targets[:, 1:] != -100
        logits = model.base_model.model.lm_head(hidden[:, :-1][active])
        loss = torch.nn.functional.cross_entropy(logits.float(), targets[:, 1:][active])
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        losses.append(round(loss.item(), 6))
        seen.extend(row["id"] for row in batch)
        if step == 0 or (step + 1) % 10 == 0:
            print(f"{step + 1}/{args.steps}: {loss.item():.4f}", flush=True)
    model.save_pretrained(args.out)
    config_path = args.out / "adapter_config.json"
    config = json.loads(config_path.read_text())
    config.update(base_model_name_or_path=MODEL, revision=REVISION)
    config_path.write_text(json.dumps(config, indent=2) + "\n")
    (args.out / "README.md").write_text(
        f"# The Mirror LoRA adapter\n\nBase model: {MODEL}\nPinned revision: {REVISION}\n"
        "Load with PEFT. See the project model card for the training and evaluation protocol.\n"
    )
    report = {
        "model": MODEL, "revision": REVISION, "seed": args.seed, "steps": args.steps,
        "batch_size": args.batch_size, "learning_rate": args.learning_rate, "examples_seen": len(seen),
        "unique_examples": len(set(seen)), "examples": seen, "losses": losses, "runtime": runtime(model),
    }
    (args.out / "training_run.json").write_text(json.dumps(report, indent=2) + "\n")

if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--data", type=Path, default=Path("data/train.jsonl"))
    cli.add_argument("--out", type=Path, default=Path("research/adapter"))
    cli.add_argument("--model", default=MODEL)
    cli.add_argument("--precision", choices=["float32", "bfloat16"])
    cli.add_argument("--steps", type=int, default=600)
    cli.add_argument("--batch-size", type=int, default=2)
    cli.add_argument("--seed", type=int, default=42)
    cli.add_argument("--learning-rate", type=float, default=2e-4)
    train(cli.parse_args())
