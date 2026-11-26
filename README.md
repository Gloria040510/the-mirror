<img src="docs/media/cover.webp" width="100%" alt="The Mirror · 认知回声室。橄榄银与铜红的两片镜面。">

<p align="center">
  <a href="https://the-mirror-lab.sweet-pony-8082.chatgpt.site/">在线实验室</a> ·
  <a href="#演示视频">演示视频</a> ·
  <a href="#在本地运行">本地运行</a> ·
  <a href="README.en.md">English</a>
</p>

**如果你和 AI 持有相反的观点，它还会给你同样的答案吗？**

以「读研期间应该实习，还是集中精力做科研？」为例。The Mirror 保留问题与背景，分别附加倾向实习、中立和倾向科研的提问。你可以并排读回答，切换镜像模式对齐相近的句子，再打开记录，核对模型究竟收到了什么。

## 演示视频

[<img src="docs/media/demo-preview.webp" width="100%" alt="实际操作片段。由三栏回答切换到镜像模式，逐句对照实习与科研两个立场的输出。">](https://raw.githubusercontent.com/Gloria040510/the-mirror/main/docs/media/the-mirror-demo.mp4)

[播放完整演示（MP4）](https://raw.githubusercontent.com/Gloria040510/the-mirror/main/docs/media/the-mirror-demo.mp4) · [英文字幕（SRT）](docs/media/the-mirror-demo.en.srt)

视频使用实际运行的界面和 Qwen 回放，依次展示立场切换、镜像模式、社会压力、证据更新、盲测揭晓和研究面板。

## 选择一次实验

| 模式 | 可操作的对照 |
| --- | --- |
| **立场切换** | 从同一个问题出发，对比两种立场和中立提问。 |
| **社会压力** | 用直接质疑和权威主张依次挑战模型的真实首答。 |
| **证据更新** | 从同一首答分支，比较缺乏依据的主张和新事实。 |
| **提示词盲测** | 在来源隐藏时先选一条回答，再揭晓原始 Prompt。 |

<picture>
  <img src="docs/media/ui-workbench.webp" width="100%" alt="实验工作台，左侧编辑问题与两种立场，右侧选择预设、推理来源和模型。">
</picture>

界面支持中文与英文、三栏回答、镜像对齐、措辞差异标记和全屏模式。预设包含科研、学习、职业和数学。每条结果保存完整消息、原始回答、模型版本和生成参数，可导出为 JSON。

<table>
  <tr>
    <th width="50%">三栏回答</th>
    <th width="50%">镜像模式</th>
  </tr>
  <tr>
    <td><a href="docs/media/ui-comparison.webp"><img src="docs/media/ui-comparison.webp" alt="倾向实习、中立提问和倾向科研的三栏真实回答"></a></td>
    <td><a href="docs/media/ui-mirror.webp"><img src="docs/media/ui-mirror.webp" alt="围绕中央分隔线对齐的两组真实回答"></a></td>
  </tr>
</table>

<details>
<summary>更多界面截图</summary>

[实验室首页](docs/media/ui-home.webp) · [证据更新](docs/media/ui-evidence.webp) · [盲测揭晓](docs/media/ui-blind.webp)

</details>

## 在本地运行

仅体验真实回放时，Node.js 20+ 和前端即可。

```sh
npm ci
npm run dev
```

打开 [localhost:3000](http://localhost:3000)，在工作台选择预设和模型，点击「播放实验」。仓库包含 **36 组预计算记录**，覆盖原始指令模型、提示词基线和 LoRA SFT。运行 `npm run build` 可生成静态部署目录 `out/`。

<details>
<summary>连接实时推理与自定义模型</summary>

使用 Python 3.10–3.12 启动本地 FastAPI。

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn mirror.api:app --host 127.0.0.1 --port 8000
```

在「模型设置」中填写 FastAPI 地址，选择「实时推理」。本地模型首次加载固定版本的 Qwen2.5-0.5B-Instruct，LoRA 从 `research/adapter/` 读取。成功的实时记录写入 `runs/experiments.sqlite`。

自定义模型须提供 OpenAI 兼容的 `/chat/completions` 接口。用 `MIRROR_API_ENDPOINTS` 设置服务端允许的基础 URL，逗号分隔，默认 `https://api.openai.com/v1`。网页设置中填写模型名和所需密钥。密钥不写入实验记录。若远程部署推理服务，请使用 HTTPS，并通过 `MIRROR_ORIGINS` 配置前端的确切来源。

</details>

## 评测与复现

合成数据包含 **2,000 道基础题、14,000 条对话和 20 个题型族**。五个题型族完整留作测试。SymPy、固定 Python 表达式和确定性规则计算答案，清单记录随机种子与数据校验和。

<img src="docs/media/ui-benchmark.webp" width="100%" alt="研究面板显示三种模型配置的事实准确率、压力翻转率、正确主张误答率、证据更新准确率和开放题措辞差异。">

已发布的是 **10 道留出题的 CPU 试评**。LoRA 训练 120 步，事实准确率为 0/10，证据更新准确率为 0/10。原始模型在同一试评中的两项结果分别为 0/10 和 2/10。没有答对中立题的模型没有可用的压力翻转率分母。开放题指标衡量文字差异，无法独立判断迎合。六道候选题仍待独立人工审核。

<details>
<summary>重新生成数据、训练和评测</summary>

```sh
python -m mirror.generate --seed 42
python -m mirror.train --data data/train.jsonl --steps 120 --batch-size 2 --precision bfloat16
for variant in base prompted lora; do
  python -m mirror.record --variant "$variant" --precision bfloat16 --tokens 160
done
python -m mirror.evaluate --per-group 1 --tokens 20 --batch-size 14 --precision bfloat16 --numeric-only
python -m scripts.release --data data
```

移除 `--per-group 1` 可在完整的留出数据上运行评测。事实指标使用 95% Wilson 区间，开放题措辞差异按预设聚类重抽样。

</details>

[训练与测试数据](public/data/mirror-dataset.zip) · [数据清单](research/dataset-manifest.json) · [LoRA 权重包](public/data/lora-adapter.zip) · [评测汇总](research/benchmark.json) · [原始评测记录](public/data/benchmark-raw.jsonl) · [模型卡片](research/model-card.md)

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `app/` | Next.js、TypeScript、D3 和 Framer Motion 交互界面 |
| `mirror/` | FastAPI、数据生成、PyTorch / Transformers / PEFT 训练和评测 |
| `research/` | LoRA 适配器、模型卡片、人工复核候选题和评测记录 |
| `docs/media/` | 界面截图、演示视频和字幕 |

基础模型及适配器的许可说明在 [研究目录](research/LICENSE-Qwen)，字体许可在 [字体目录](public/fonts/)。第三方研究与项目用于方法参考。

[Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct) · [SycophancyEval](https://github.com/meg-tong/sycophancy-eval) · [BertViz](https://github.com/jessevig/bertviz) · [Multiverse](https://github.com/gfxroy/multiverse)
