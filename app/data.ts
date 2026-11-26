import presets from '../public/data/presets.json';

export type Lang = 'zh'|'en';
export type Mode = 'perspective'|'pressure'|'evidence'|'blind';
export type Variant = 'base'|'lora'|'prompted'|'api';
export type LocalizedPreset = {title:string;question:string;a:string;b:string;labels:string[]};
export type Preset = {id:string;mode:Mode;topic:string;zh:LocalizedPreset;en:LocalizedPreset;expected?:string[]};
export type Message = {role:string;content:string};
export type Branch = {label:string;messages:Message[];response:string};
export type Run = {
  id:string; time:string; origin:'live'|'replay'; mode:Mode; language:Lang; question:string; preset?:string;
  variant:Variant; model:string; parameters:Record<string,unknown>; runtime?:Record<string,unknown>; branches:Branch[];
  expected?:string[] | null;
};
export type Metric = {hits:number;n:number;rate:number|null;ci:[number,number]|null;unit?:string};
export type Benchmark = {
  questions:number; checkpoint:string; tokens:number; seed:number; hardware:string; variants:Record<string, Record<string,Metric>>;
};
export const examples = presets as Preset[];
export const modes: Mode[] = ['perspective','pressure','evidence','blind'];
export const variants: Variant[] = ['base','prompted','lora'];
export const copy = {
  zh: {
    nav:['实验室','实验档案','研究方法'], settings:'模型设置', language:'EN',
    eyebrow:'大语言模型行为实验室', title:'AI 是否太容易同意你？',
    intro:'同一个问题，换一种立场。观察 AI 的回答在何处保持一致，又在何处随着你改变。',
    start:'开始实验', method:'了解实验方法', figure:'镜面习作 · 双重视角',
    lab:'实验工作台', replay:'真实回放', live:'实时推理',
    compare:'并排对照', mirror:'镜像模式', full:'全屏', exit:'退出全屏',
    prompt:'你的问题', promptTip:'三次回答共用这段背景。', example:'选择预设', custom:'使用自定义问题',
    run:'运行实验', play:'播放实验', loading:'模型作答中', preparing:'正在加载记录',
    models:{base:'原始模型', prompted:'提示词基线', lora:'LoRA 微调', api:'自定义 API'},
    modeNames:['立场切换','社会压力','证据更新','提示词盲测'],
    modes:[
      '保持问题与背景不变，只改变你表达的立场。',
      '逐次加入质疑与权威主张，观察答案是否改变。',
      '从初次回答分支，对照未经验证的主张和可用的新证据。',
      '隐藏提示词与立场，先选择你认为最好的回答，再揭晓来源。',
    ],
    branchLabels:[['立场 A','中立提问','立场 B'],['初次作答','直接质疑','再次追问'],['原始数据','只有主张','加入证据'],['立场 A','中立提问','立场 B']],
    fieldLabels:[['立场 A','立场 B'],['第一次质疑','第二次质疑'],['未经验证的主张','经过核实的新证据'],['立场 A','立场 B']],
    topics:{research:'科研',learning:'学习',career:'职业',math:'数学'},
    responses:'回答对照', wait:'选择预设并播放，查看完整回答与提示词。', choose:'选择此回答', picked:'你的选择',
    reveal:'跳过选择并揭晓', hidden:'来源已隐藏', audit:'查看 Prompt 与运行参数', htmlLang:'zh-CN', replayTag:'预计算实验 · 完整记录', liveTag:'实时生成 · 完整记录',
    export:'导出记录', highlight:'高亮措辞差异',
    promptLabel:'发送给模型的完整消息', responseLabel:'原始回答',
    archive:'实验档案', archiveDesc:'回看预计算实验，以及这台设备上保存的实时记录。', all:'全部实验', noRecords:'当前筛选条件下没有记录。',
    methodDesc:'控制提问变量，保留原始输出，用可验证的答案衡量模型行为。', eval:'事实性评测', metric:'指标',
    links:'数据与研究材料', dataset:'合成数据清单', raw:'原始评测记录', adapter:'LoRA 权重', card:'模型卡片', code:'完整项目源码',
    modelSummary:'Qwen2.5-0.5B-Instruct · 原始模型 / 提示词基线 / LoRA SFT',
    perspectiveNote:'开放题只呈现措辞差异与盲选结果。立场差异本身无法判断对错或迎合。',
    foot:'一个可复现的模型行为实验', verified:'可验证答案', lexical:'文字重合度', noReport:'本次评测记录暂不可用。',
    missing:'该组合没有预计算记录。可切换模型或使用实时推理。',
    configure:'连接实时推理', endpoint:'FastAPI 服务地址', configureCopy:'预计算回放无需连接。运行自定义问题时，请使用已启动的 FastAPI。', save:'保存设置', cancel:'取消',
    protocol:'推理来源', apiEndpoint:'OpenAI 兼容 API 地址', apiKey:'API 密钥', apiModel:'模型名称',
    secret:'密钥只在当前页面会话中使用，由配置的 FastAPI 转发。', badInput:'请输入问题和两个对照条件。', badServer:'无法连接推理服务。请检查 FastAPI 地址和后端状态。',
    close:'关闭',
  },
  en: {
    nav:['Lab','Archive','Method'], settings:'Model settings', language:'中文',
    eyebrow:'A LANGUAGE MODEL BEHAVIOR LAB', title:'Does AI agree with you too much?',
    intro:'One question, a different stance. See where an AI’s answers stay consistent, and where they change with you.',
    start:'Start an experiment', method:'Explore the method', figure:'Mirror study · Two perspectives',
    lab:'Experiment lab', replay:'Recorded runs', live:'Live inference',
    compare:'Side by side', mirror:'Mirror mode', full:'Fullscreen', exit:'Exit fullscreen',
    prompt:'Your question', promptTip:'All three answers share this background.', example:'Choose a preset', custom:'Use a custom question',
    run:'Run experiment', play:'Play experiment', loading:'Generating answers', preparing:'Loading records',
    models:{base:'Original model', prompted:'Prompt baseline', lora:'LoRA fine-tuned', api:'Custom API'},
    modeNames:['Perspective shift','Social pressure','Evidence update','Prompt blind test'],
    modes:[
      'Keep the question and context constant. Change only the stance you express.',
      'Add a challenge and then an appeal to authority to see whether the answer changes.',
      'Branch from the initial answer with an unverified claim and a verified update.',
      'Compare answers with their sources hidden. Choose your favorite before seeing the prompts.',
    ],
    branchLabels:[['Perspective A','Neutral','Perspective B'],['Initial answer','First challenge','Second challenge'],['Original facts','Claim only','New evidence'],['Perspective A','Neutral','Perspective B']],
    fieldLabels:[['Perspective A','Perspective B'],['First challenge','Second challenge'],['Unverified claim','Verified new evidence'],['Perspective A','Perspective B']],
    topics:{research:'Research',learning:'Learning',career:'Career',math:'Math'},
    responses:'Compare answers', wait:'Choose and play a preset to see the answers and prompts.', choose:'Choose this answer', picked:'Your choice',
    reveal:'Reveal without choosing', hidden:'Source hidden', audit:'Prompts and run settings', htmlLang:'en', replayTag:'Precomputed experiment · Full trace', liveTag:'Live generation · Full trace',
    export:'Export record', highlight:'Highlight wording differences',
    promptLabel:'Messages sent to the model', responseLabel:'Raw response',
    archive:'Experiment archive', archiveDesc:'Browse precomputed records and live runs saved on this device.', all:'All experiments', noRecords:'No experiments match this filter.',
    methodDesc:'Vary one condition, keep the raw output, and score behavior where answers can be verified.', eval:'Factual benchmark', metric:'Metric',
    links:'Research materials', dataset:'Dataset manifest', raw:'Raw evaluation records', adapter:'LoRA weights', card:'Model card', code:'Complete project source',
    modelSummary:'Qwen2.5-0.5B-Instruct · Original / Prompt baseline / LoRA SFT',
    perspectiveNote:'Open questions show wording overlap and blind choices. Differences in stance alone cannot establish accuracy or sycophancy.',
    foot:'A reproducible model behavior experiment', verified:'Verified answer', lexical:'Wording overlap', noReport:'The evaluation record is unavailable.',
    missing:'There is no recorded run for this combination. Switch models or use live inference.',
    configure:'Connect live inference', endpoint:'FastAPI URL', configureCopy:'Recorded runs are available offline. Start FastAPI to run custom questions.', save:'Save settings', cancel:'Cancel',
    protocol:'Inference source', apiEndpoint:'OpenAI-compatible API URL', apiKey:'API key', apiModel:'Model name',
    secret:'The key stays in this page session and is forwarded by the FastAPI server you configure.', badInput:'Enter a question and both comparison conditions.', badServer:'Could not reach inference. Check the FastAPI URL and server status.',
    close:'Close',
  },
};

export const metrics = {
  accuracy:['事实准确率','Ground truth accuracy'],
  flips:['压力翻转率','Sycophancy flip rate'],
  false_disagreement:['正确主张误答率','False disagreement rate'],
  evidence:['证据更新准确率','Evidence update accuracy'],
  perspective:['开放题措辞差异','Perspective sensitivity'],
};
