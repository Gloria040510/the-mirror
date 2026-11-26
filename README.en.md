# The Mirror

<img src="docs/media/cover.webp" width="100%" alt="The Mirror, a bilingual language model behavior lab.">

The Mirror is a bilingual experiment lab for exploring how language models respond to a stance, social pressure, and new evidence. It defaults to recorded Qwen runs. Each replay includes the exact messages, raw responses, checkpoint, settings, date, and runtime.

[中文 README](README.md) · [Model card](research/model-card.md) · [Dataset manifest](research/dataset-manifest.json)

## See the interface

[<img src="docs/media/demo-preview.webp" width="100%" alt="A recorded interaction switching three real model responses to the sentence-aligned mirror view.">](https://raw.githubusercontent.com/Gloria040510/the-mirror/main/docs/media/the-mirror-demo.mp4)

[Open the live lab](https://the-mirror-lab.sweet-pony-8082.chatgpt.site/) · [Watch the demo (MP4)](https://raw.githubusercontent.com/Gloria040510/the-mirror/main/docs/media/the-mirror-demo.mp4) · [English subtitles (SRT)](docs/media/the-mirror-demo.en.srt)

The video covers side-by-side answers, mirror alignment, social pressure, evidence updates, blind selection and the research panel. [Explore full interface screenshots](docs/media/).

## Run or deploy

Node.js 20+ and Python 3.10–3.12 are supported. Recorded experiments only require the frontend.

```sh
npm ci
npm run dev
```

Start FastAPI separately for live experiments.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn mirror.api:app --host 127.0.0.1 --port 8000
```

Enter the backend URL in Model settings and select Live inference. The backend downloads the pinned Qwen checkpoint on first use. Set `MIRROR_ADAPTER` to use an adapter stored outside `research/adapter`. Completed live traces are written to `runs/experiments.sqlite`. The browser shows its most recent 60 live runs.

For an OpenAI-compatible provider, configure its base URL, model ID, and any API key in Model settings. Set `MIRROR_API_ENDPOINTS` to a comma-separated list of provider base URLs, defaulting to `https://api.openai.com/v1`. The key is forwarded in memory and excluded from traces.

For static deployment, run `npm run build` and publish `out/`. Recorded runs require no backend. For remote live inference, serve FastAPI over HTTPS and list the frontend origin in `MIRROR_ORIGINS`. The local invocation above listens on loopback.

## Experiment controls

- **Perspective shift** sends the same question with stance A, no stance, and stance B in separate contexts.
- **Social pressure** adds a direct challenge and then an appeal to authority, each following the actual earlier answers.
- **Evidence update** starts from the same actual answer and branches into an unsupported claim and a verified update.
- **Prompt blind test** shuffles three answers, then reveals their prompt conditions after the user chooses.

Mirror mode aligns sentences using surface word overlap. Differences in wording and blind selections do not establish factual accuracy or sycophancy. An answer can reveal the condition in its own text.

## Reproduce

```sh
python -m mirror.generate --seed 42
python -m mirror.train --data data/train.jsonl --steps 120 --batch-size 2 --precision bfloat16
for variant in base prompted lora; do
  python -m mirror.record --variant "$variant" --precision bfloat16 --tokens 160
done
python -m mirror.evaluate --per-group 1 --tokens 20 --batch-size 14 --precision bfloat16 --numeric-only
```

The generator produces 2,000 problems across 20 template families and 14,000 bilingual conversations. Five complete families are held out, covering 500 problems and 3,500 dialogs. The remaining 1,500 problems contribute 10,500 training dialogs. The generated manifest records split hashes. SymPy, trusted Python expressions, and deterministic rules compute answers.

Omit `--per-group` to evaluate all held-out cases. The shipped measurements are a small CPU pilot. Raw model outputs are in `research/benchmark-*.jsonl` and summary metrics in `research/benchmark.json`. The six independent examples in `research/manual-review.jsonl` await external human review. No external benchmark samples are included. DPO is optional and outside the shipped pilot.

The [model card](research/model-card.md) documents sampling, metrics, limitations, licenses and sources.

To regenerate the research downloads after running the pipeline, use `python -m scripts.release --data data` and rebuild the static site.
