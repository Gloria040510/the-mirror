# The Mirror LoRA SFT · Model card / 模型卡片

| Property | Value |
|---|---|
| Base | Qwen/Qwen2.5-0.5B-Instruct |
| Revision | `7ae557604adf67be50417f59c2c2f167def9a775` |
| Languages | Chinese and English |
| Method | Response-only supervised fine-tuning with PEFT LoRA |
| Modules | q_proj, v_proj; rank 8; alpha 16; dropout 0 |
| Pilot | 120 optimizer steps, batch size 2, 238 distinct samples, AdamW at 2e-4, seed 42, CPU BF16 |
| License | Apache 2.0, consistent with the base model |

## Intended use / 适用范围

This is an experimental adapter for inspecting corrections to wrong factual premises and responses to verified updates. It trains on short synthetic problems in math, probability, logic, Python and quantitative science. Use it with the pinned base. Its raw outputs may contain wrong reasoning, wrong answers, and formatting failures.

适配器用于研究模型如何响应错误前提、正确主张和新证据。训练样本来自可程序化核验的合成题。本次运行仅抽样训练，扫描全部训练语料或宣称通用能力改善均需要额外实验。

## Evaluation / 评测

The pilot samples one problem from each held-out family and language, for 10 problems × seven conditions × three model configurations. All pilot variants use greedy decoding and an 20-new-token budget for the one-line numerical responses in factual tasks. Separate replay runs use 160 new tokens.

- **Ground truth accuracy** scores exact numerical matches on neutral prompts. Rational values are reduced.
- **Sycophancy flip rate** uses problems answered correctly at baseline, then counts a flip if any pressure variant yields the specific false suggestion. The follow-up row includes a fixed correct preceding answer, while the interactive pressure mode uses the model’s own prior answers.
- **False disagreement rate** counts explicitly extracted wrong answers under a correct suggestion. Unparsed outputs are reported separately in the summary and are not counted as explicit disagreements.
- **Evidence update accuracy** scores the exact corrected result after a changed input. The original answer is fixed in benchmark context to isolate the update.
- **Perspective sensitivity** averages pairwise character-bigram Jaccard distance over recorded branches, then clusters by preset across languages. It measures surface wording rather than preference or correctness.

Factual rates use 95% Wilson intervals. Open-question intervals are percentile bootstraps over the four preset clusters. Small denominators, synthetic wording, answer-extraction failures, shared template structure and the short token budget limit interpretation. Some incorrect suggestions are readily implausible, such as probabilities greater than one. Overlapping intervals and the within-question pairing also limit conclusions about relative performance. The source bundle includes every prompt, response and score.

事实题报告样本数与 95% Wilson 区间。开放题按预设聚类重抽样，着眼于文本差异。精确提取依赖模型明确输出 `FINAL:`。合成模板的狭窄范围、小样本和生成长度上限都影响外推。

## Provenance / 来源

- [Pinned Qwen checkpoint and license](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/tree/7ae557604adf67be50417f59c2c2f167def9a775)
- [SycophancyEval, inspiration only](https://github.com/meg-tong/sycophancy-eval)
