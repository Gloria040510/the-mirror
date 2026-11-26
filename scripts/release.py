"""Re-score raw outputs and assemble the public files used by the static export."""
import json
import shutil
from collections import defaultdict
from fractions import Fraction
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from mirror.evaluate import extract, get_metrics, perspective

ROOT = Path(__file__).resolve().parent.parent
RESEARCH = ROOT / "research"
PUBLIC = ROOT / "public/data"
VARIANTS = ("base", "prompted", "lora")

def read(path):
    return json.loads(path.read_text())

def release(data):
    settings = read(RESEARCH / "benchmark.json")
    lines = []
    for variant in VARIANTS:
        replay = read(PUBLIC / f"replays-{variant}.json")
        assert len(replay) == 12 and all(len(run["branches"]) == 3 for run in replay)
        path = RESEARCH / f"benchmark-{variant}.jsonl"
        results = [json.loads(line) for line in path.read_text().splitlines()]
        assert len(results) == settings["questions"] * 7
        groups = defaultdict(dict)
        for result in results:
            actual = extract(result["response"])
            result.update(parsed=str(actual) if actual is not None else None,
                          match=actual == Fraction(result["expected"]))
            groups[result["problem"]][result["variant"]] = result
        metrics = get_metrics(groups)
        metrics["perspective"] = perspective(variant,settings["seed"])
        settings["variants"][variant] = metrics
        payload = "".join(json.dumps(r,ensure_ascii=False)+"\n" for r in results)
        path.write_text(payload)
        lines.append(payload)
    summary = json.dumps(settings, indent=2)+"\n"
    (PUBLIC / "benchmark.json").write_text(summary)
    (RESEARCH / "benchmark.json").write_text(summary)
    (PUBLIC / "benchmark-raw.jsonl").write_text("".join(lines))
    shutil.copyfile(RESEARCH / "model-card.md", PUBLIC / "model-card.md")
    shutil.copyfile(RESEARCH / "dataset-manifest.json", PUBLIC / "dataset-manifest.json")
    with ZipFile(PUBLIC / "mirror-dataset.zip","w",ZIP_DEFLATED) as output:
        for name in ("train.jsonl","test.jsonl","manifest.json"):
            output.write(data / name,name)
    with ZipFile(PUBLIC / "lora-adapter.zip","w",ZIP_DEFLATED) as output:
        for file in sorted((RESEARCH / "adapter").iterdir()):
            output.write(file,file.name)
        output.write(RESEARCH / "LICENSE-Qwen","LICENSE")
        output.write(RESEARCH / "model-card.md","MODEL_CARD.md")
    source_archive = PUBLIC / "the-mirror-source.zip"
    with ZipFile(source_archive,"w",ZIP_DEFLATED) as output:
        for name in ("app","docs","mirror","public","research","scripts"):
            for file in sorted((ROOT / name).rglob("*")):
                if file.is_file() and file != source_archive and "__pycache__" not in file.parts and file.suffix != ".tmp":
                    output.write(file,file.relative_to(ROOT))
        for name in ("README.md","README.en.md","requirements.txt","package.json","package-lock.json","next.config.ts","next-env.d.ts","tsconfig.json",".gitignore"):
            output.write(ROOT / name,name)

if __name__ == "__main__":
    import argparse
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--data", type=Path, default=Path("data"))
    release(cli.parse_args().data)
