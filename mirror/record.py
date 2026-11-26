"""Generate traceable public replays using live Qwen inference."""
import argparse
import json
from pathlib import Path

from mirror.model import GENERATION, MODEL, REVISION, adapter_digest, infer, load_model, runtime
from mirror.protocol import run_definition

def record(args):
    presets = json.loads(Path("public/data/presets.json").read_text())
    output = Path(f"public/data/replays-{args.variant}.json")
    partial = output.with_suffix(".tmp")
    records = []
    tokenizer, model = load_model(args.model, args.adapter if args.variant == "lora" else None, args.precision)
    params = GENERATION | {"max_new_tokens": args.tokens, "revision": REVISION}
    if args.variant == "lora":
        params["adapter_sha256"] = adapter_digest(args.adapter)
    for preset in presets:
        for lang in ("zh", "en"):
            definition = {
                **preset[lang], "mode": preset["mode"], "variant": args.variant,
                "language": lang, "preset": preset["id"], "expected": preset.get("expected"),
            }
            result = run_definition(
                definition, lambda batch: infer(tokenizer, model, batch, args.tokens),
                MODEL, params, "replay", runtime(model),
            )
            records.append(result)
            partial.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
            print(preset["id"], lang, flush=True)
    partial.replace(output)

if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--model", default=MODEL)
    cli.add_argument("--variant", choices=["base", "prompted", "lora"], default="base")
    cli.add_argument("--adapter", default="research/adapter")
    cli.add_argument("--precision", choices=["float32", "bfloat16"])
    cli.add_argument("--tokens", type=int, default=160)
    record(cli.parse_args())
