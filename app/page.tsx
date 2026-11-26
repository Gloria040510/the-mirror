'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowDown, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, CircleDot, Columns3, FlaskConical, Focus, GitBranch, Globe2, History, Maximize, Minimize, Play, Settings2, ShieldQuestion, WandSparkles, X} from 'lucide-react';
import {Benchmark, copy, examples, Lang, Mode, modes, Run, Variant, variants} from './data';
import {BenchmarkChart, Results} from './results';

const icons = [GitBranch,ShieldQuestion,FlaskConical,Focus];
const empty = {question:'',a:'',b:''};
type Settings = {endpoint:string; source:'local'|'api'; apiEndpoint:string; apiKey:string; apiModel:string};
const initialSettings:Settings = {endpoint:'http://localhost:8000',source:'local',apiEndpoint:'https://api.openai.com/v1',apiKey:'',apiModel:''};

function Logo({footer=false}:{footer?:boolean}) {
  return <a className={`wordmark ${footer?'footer-wordmark':''}`} href="#" aria-label="The Mirror">
    <svg width="33" height="33" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M15.5 4.5C8.6 4.5 3 10.1 3 17s5.6 12.5 12.5 12.5v-25Z" fill="currentColor"/>
      <path d="M18.5 4.5C25.4 4.5 31 10.1 31 17s-5.6 12.5-12.5 12.5v-25Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg><span>The Mirror<span className="brand-stop">.</span></span>
  </a>;
}

export default function Page() {
  const [lang,setLang]=useState<Lang>('zh');
  const [mode,setMode]=useState<Mode>('perspective');
  const [preset,setPreset]=useState('grad');
  const [fields,setFields]=useState({question:examples[0].zh.question,a:examples[0].zh.a,b:examples[0].zh.b});
  const [source,setSource]=useState<'replay'|'live'>('replay');
  const [variant,setVariant]=useState<Variant>('base');
  const [records,setRecords]=useState<Run[]>([]);
  const [history,setHistory]=useState<Run[]>([]);
  const [report,setReport]=useState<Benchmark>();
  const [run,setRun]=useState<Run>();
  const [mirror,setMirror]=useState(false);
  const [full,setFull]=useState(false);
  const [highlight,setHighlight]=useState(true);
  const [blindOrder,setBlindOrder]=useState([0,1,2]);
  const [choice,setChoice]=useState<number|null>(null);
  const [revealed,setRevealed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<Mode|'all'>('all');
  const [settings,setSettings]=useState(initialSettings);
  const [draft,setDraft]=useState(initialSettings);
  const dialog=useRef<HTMLDialogElement>(null);
  const fullscreen=useRef<HTMLDivElement>(null);
  const resultAnchor=useRef<HTMLDivElement>(null);
  const t=copy[lang];

  useEffect(()=>{
    Promise.allSettled(variants.map(v=>fetch(`/data/replays-${v}.json`).then(r=>r.ok?r.json():[]))).then(data=>{
      setRecords(data.flatMap(x=>x.status==='fulfilled' && Array.isArray(x.value)?x.value:[]));
      setLoaded(true);
    });
    fetch('/data/benchmark.json').then(r=>r.ok?r.json():null).then(x=>x&&setReport(x)).catch(()=>{});
    try { setHistory(JSON.parse(localStorage.getItem('mirror-history')??'[]')); } catch {}
    const changed=()=>setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange',changed);
    return ()=>document.removeEventListener('fullscreenchange',changed);
  },[]);

  useEffect(()=>{document.documentElement.lang=t.htmlLang;},[t.htmlLang]);

  const spec=examples.find(e=>e.id===preset);
  const modeIndex=modes.indexOf(mode);
  const canReplay = source==='replay' && !!spec;
  const replay = records.find(r=>r.preset===preset && r.language===lang && r.variant===variant);
  const liveMode = settings.source==='api' && source==='live';
  const candidates=examples.filter(item=>item.mode===mode);
  const archive=[...history,...records].filter(r=>r.language===lang && (filter==='all' || r.mode===filter));

  function reset() {
    setRun(undefined);
    setError('');
  }

  function usePreset(id:string, language=lang) {
    setPreset(id);
    const option=examples.find(e=>e.id===id);
    setFields(option ? option[language] : empty);
    setSource(option ? 'replay' : 'live');
    reset();
  }

  function changeMode(next:Mode) {
    if (mode===next) return;
    setMode(next);
    usePreset(examples.find(e=>e.mode===next)!.id);
  }

  function toggleLanguage() {
    const next=lang==='zh'?'en':'zh';
    setLang(next);
    if (spec) {
      setFields(spec[next]);
      reset();
    }
  }

  function setField(key:keyof typeof fields,value:string) {
    if (preset) {
      setPreset('');
      setSource('live');
    }
    setFields(previous=>({...previous,[key]:value}));
    reset();
  }

  function suggestStances() {
    const question=fields.question.trim().replace(/[？?。.!！]+$/, '');
    const split=lang==='zh'
      ? question.match(/^.*?(?:，|。|：|应该|我该)([^，。]+?)[，、 ]*(?:还是|或是)(.+)$/)
      : question.match(/(?:should (?:I|we)|would you|whether to) (.+?) (?:or) (.+)$/i);
    const a = split ? (lang==='zh'? `我倾向于${split[1].trim().replace(/^(?:我(?:们)?应该|应该|我该)/,'')}。` : `I lean toward the first option: ${split[1].trim()}.`)
      : (lang==='zh'?'我倾向于支持题目中提出的做法。':'I lean in favor of the approach raised in the question.');
    const b = split ? (lang==='zh'? `我倾向于${split[2].trim()}。` : `I lean toward the second option: ${split[2].trim()}.`)
      : (lang==='zh'?'我对题目中提出的做法持保留态度。':'I have reservations about the approach raised in the question.');
    setFields(previous=>({...previous,a,b}));
    reset();
  }

  function present(record:Run) {
    const order=[0,1,2];
    for(let i=order.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    setBlindOrder(order);
    setChoice(null);
    setRevealed(false);
    setRun(record);
    requestAnimationFrame(()=>resultAnchor.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  }

  async function execute(e:FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (source==='replay') {
      if (replay) present(replay);
      else setError(t.missing);
      return;
    }
    if (![fields.question,fields.a,fields.b].every(x=>x.trim().length)) {
      setError(t.badInput);
      return;
    }
    if (liveMode && (!settings.apiEndpoint || !settings.apiModel)) {
      openSettings();
      return;
    }
    setBusy(true);
    setRun(undefined);
    try {
      const request={
        ...fields, language:lang, mode, variant:liveMode?'api':variant, preset:preset||null,
        labels:spec?.[lang].labels??t.branchLabels[modeIndex], expected:spec?.expected??null,
        api:liveMode?{endpoint:settings.apiEndpoint,key:settings.apiKey,model:settings.apiModel}:null,
      };
      const response=await fetch(`${settings.endpoint.replace(/\/+$/,'')}/v1/experiment`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(request),
        signal:AbortSignal.timeout(240000),
      });
      if (!response.ok) {
        const body=await response.json().catch(()=>null);
        throw new Error(typeof body?.detail==='string'?body.detail:t.badServer);
      }
      const result:Run=await response.json();
      const next=[result,...history].slice(0,60);
      setHistory(next);
      try { localStorage.setItem('mirror-history',JSON.stringify(next)); } catch {}
      present(result);
    } catch (error) {
      const message=error instanceof TypeError || (error instanceof DOMException) ? t.badServer : (error as Error).message;
      setError(message);
    } finally { setBusy(false); }
  }

  function openSettings() {
    setDraft(settings);
    dialog.current?.showModal();
  }

  function loadArchive(record:Run) {
    setMode(record.mode);
    setPreset(record.preset??'');
    setSource(record.origin);
    setVariant(record.variant==='api'?'base':record.variant);
    const example=examples.find(p=>p.id===record.preset);
    const isStance=record.mode==='perspective'||record.mode==='blind';
    const condition=(index:number)=>(record.branches[index].messages.at(-1)?.content??'').replace(`${record.question}\n\n`,'');
    setFields(example?.[record.language]??{question:record.question,a:condition(isStance?0:1),b:condition(2)});
    setError('');
    present(record);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (full) setFull(false);
    else if (fullscreen.current?.requestFullscreen) {
      try { await fullscreen.current.requestFullscreen(); } catch { setFull(true); }
    } else setFull(true);
  }

  return <>
    <header className="topbar">
      <div className="container top-inner">
        <Logo/>
        <nav aria-label={lang==='zh'?'主导航':'Main navigation'}>
          <a href="#lab" className="active">{t.nav[0]}</a><a href="#archive">{t.nav[1]}</a><a href="#method">{t.nav[2]}</a>
        </nav>
        <div className="head-actions">
          <button className="language" onClick={toggleLanguage} disabled={busy}><Globe2 size={15}/>{t.language}</button>
          <button className="settings" onClick={openSettings} title={t.settings} aria-label={t.settings}><Settings2 size={17}/><span>{t.settings}</span></button>
        </div>
      </div>
    </header>
    <main className="container">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="micro hero-kicker"><span/>{t.eyebrow}</p>
          <h1 id="hero-title">The Mirror<span>.</span></h1>
          <h2 className={`hero-question ${lang}`}>{t.title}</h2>
          <p className="hero-description">{t.intro}</p>
          <div className="hero-actions">
            <a className="solid" href="#lab"><Play size={15} fill="currentColor"/>{t.start}</a>
            <a className="text-link" href="#method">{t.method}<ArrowDown size={15}/></a>
          </div>
        </div>
        <figure className="hero-figure">
          <div className="plate">
            {/* Static export serves the optimized WebP as-is. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/mirror.webp" alt={lang==='zh'?'橄榄银与铜红色的半圆镜面装置':'A circular mirror sculpture with silver-olive and copper-red halves'} width={1440} height={960} fetchPriority="high"/>
            <span className="reticle rt-lt"/><span className="reticle rt-rt"/><span className="reticle rt-lb"/><span className="reticle rt-rb"/>
            <span className="plate-text left">A</span><span className="plate-text right">B</span>
          </div>
          <figcaption><span>{t.figure}</span><span>THE MIRROR STUDIES</span></figcaption>
        </figure>
      </section>

      <section id="lab" className="lab" aria-labelledby="lab-title">
        <div className={`lab-view ${full?'is-full':''}`} ref={fullscreen}>
          <div className="lab-inner">
            <div className="section-heading">
              <div className="section-name"><span className="section-icon"><FlaskConical size={18}/></span><h2 id="lab-title">{t.lab}</h2></div>
              <div className="lab-actions">
                <span className={`status ${source}`}><span className="dot"/>{source==='replay'?t.replay:t.live}</span>
                <div className="view-toggle" aria-label={t.compare}>
                  <button title={t.compare} aria-label={t.compare} aria-pressed={!mirror} onClick={()=>setMirror(false)}><Columns3 size={17}/></button>
                  <button title={t.mirror} aria-label={t.mirror} aria-pressed={mirror} onClick={()=>setMirror(true)}><GitBranch size={17}/></button>
                </div>
                <button className="icon-button" aria-label={full?t.exit:t.full} title={full?t.exit:t.full} onClick={toggleFullscreen}>{full?<Minimize size={17}/>:<Maximize size={17}/>}</button>
              </div>
            </div>
            <div className="mode-tabs" aria-label={t.lab}>
              {modes.map((m,i)=>{
                const Icon=icons[i];
                return <button className={mode===m?'current':''} key={m} aria-pressed={mode===m} onClick={()=>changeMode(m)} disabled={busy}>
                  <Icon size={17}/><span>{t.modeNames[i]}</span>
                </button>;
              })}
            </div>
            <form className="composer" onSubmit={execute}>
              <div className="composer-main">
                <div className="mode-guide"><span>{t.modes[modeIndex]}</span>
                  {!preset&&(mode==='perspective'||mode==='blind')&&<button type="button" className="quiet" disabled={busy||!fields.question.trim()} onClick={suggestStances}><WandSparkles size={14}/>{lang==='zh'?'建议对照立场':'Suggest opposing stances'}</button>}
                </div>
                <label className="label-row" htmlFor="question"><strong>{t.prompt}</strong><span>{t.promptTip}</span></label>
                <textarea id="question" className="question" value={fields.question} onChange={e=>setField('question',e.target.value)} maxLength={2500} rows={2} disabled={busy}/>
                <div className="stances">
                  {(['a','b'] as const).map((key,i)=><label key={key} className={`stance tone-${i*2}`}>
                    <span><i className="dot"/>{t.fieldLabels[modeIndex][i]}</span>
                    <textarea aria-label={t.fieldLabels[modeIndex][i]} value={fields[key]} onChange={e=>setField(key,e.target.value)} maxLength={1500} rows={2} disabled={busy}/>
                  </label>)}
                </div>
              </div>
              <aside className="composer-side">
                <label className="select-label" htmlFor="preset">{t.example}</label>
                <div className="select-wrap"><select id="preset" value={preset} onChange={e=>usePreset(e.target.value)} disabled={busy}>
                  <option value="">{t.custom}</option>{candidates.map(p=><option key={p.id} value={p.id}>{p[lang].title}</option>)}
                </select><ChevronDown size={15}/></div>
                <label className="select-label" htmlFor="source">{t.protocol}</label>
                <div className="select-wrap"><select id="source" value={source} onChange={e=>{setSource(e.target.value as 'replay'|'live');reset();}} disabled={busy}>
                  <option value="replay" disabled={!spec}>{t.replay}</option><option value="live">{t.live}</option>
                </select><ChevronDown size={15}/></div>
                <label className="sr-only" htmlFor="variant">{t.settings}</label>
                <div className="select-wrap"><select id="variant" value={liveMode?'api':variant} onChange={e=>{setVariant(e.target.value as Variant);reset();}} disabled={busy || liveMode}>
                  {(liveMode?['api'] as Variant[]:variants).map(v=><option value={v} key={v}>{t.models[v]}</option>)}
                </select><ChevronDown size={15}/></div>
                <button className="solid run" type="submit" disabled={busy || (canReplay&&!loaded)}>
                  {busy?<span className="spinner"/>:<Play size={15} fill="currentColor"/>}
                  {busy?t.loading:canReplay?(loaded?t.play:t.preparing):t.run}
                </button>
                {source==='live'&&<button type="button" className="quiet connect" onClick={openSettings}><Settings2 size={15}/>{t.configure}</button>}
              </aside>
              {error&&<p role="alert" className="error">{error}</p>}
            </form>
            <div className="result-anchor" ref={resultAnchor}/>
            {run ? <Results key={run.id} run={run} lang={lang} mirror={mirror} highlight={highlight} onHighlight={()=>setHighlight(!highlight)} order={blindOrder} choice={choice} onChoice={i=>{setChoice(i);setRevealed(true);}} revealed={revealed} onReveal={()=>setRevealed(true)}/>
              : <div className="empty-results"><BookOpen size={16}/>{t.wait}</div>}
          </div>
        </div>
      </section>

      <section id="archive" className="lower-section" aria-labelledby="archive-title">
        <div className="section-heading lower-heading">
          <div><div className="section-name"><span className="section-icon"><History size={18}/></span><h2 id="archive-title">{t.archive}</h2></div><p>{t.archiveDesc}</p></div>
          <div className="select-wrap filter"><select aria-label={t.all} value={filter} onChange={e=>setFilter(e.target.value as Mode|'all')}>
            <option value="all">{t.all}</option>{modes.map((m,i)=><option value={m} key={m}>{t.modeNames[i]}</option>)}
          </select><ChevronDown size={15}/></div>
        </div>
        <div className="archive-list">
          {archive.length ? (filter==='all'?archive.slice(0,9):archive).map(r=><button className="archive-row" key={r.id} disabled={busy} onClick={()=>loadArchive(r)}>
            <span className="archive-mode">{t.modeNames[modes.indexOf(r.mode)]}</span><strong>{r.question}</strong>
            <span className="archive-model">{t.models[r.variant]}</span><span className="archive-source"><span className="dot"/>{r.origin==='replay'?t.replay:t.live}</span><ChevronRight size={17}/>
          </button>) : <div className="empty-results">{loaded?t.noRecords:t.preparing}</div>}
          {filter==='all'&&archive.length>9&&<div className="archive-filters">{modes.map((m,i)=><button className="outline" key={m} onClick={()=>setFilter(m)}>{t.modeNames[i]}</button>)}</div>}
        </div>
      </section>

      <section id="method" className="lower-section method-section" aria-labelledby="method-title">
        <div className="section-heading lower-heading">
          <div><div className="section-name"><span className="section-icon"><BookOpen size={18}/></span><h2 id="method-title">{t.nav[2]}</h2></div><p>{t.methodDesc}</p></div>
        </div>
        <div className="research-grid">
          <article className="benchmark">
            <p className="micro"><CircleDot size={14}/>{lang==='zh'?'留出题型 · 小规模试验':'HELD-OUT FAMILIES · PILOT'}</p>
            <h3>{t.eval}</h3><p>{t.modelSummary}</p>
            {report ? <><p>{lang==='zh'?`${report.questions} 道基础题 · ${report.hardware} · 最多 ${report.tokens} 个新 token`:`${report.questions} base questions · ${report.hardware} · Up to ${report.tokens} new tokens`}</p><BenchmarkChart report={report} lang={lang}/></> : <p className="method-note">{t.noReport}</p>}
          </article>
          <aside className="materials"><h3>{t.links}</h3>
            {[
              [lang==='zh'?'训练与留出数据':'Training and held-out data','/data/mirror-dataset.zip'],[t.dataset,'/data/dataset-manifest.json'],[t.raw,'/data/benchmark-raw.jsonl'],
              [t.adapter,'/data/lora-adapter.zip'],[t.card,'/data/model-card.md'],[t.code,'/data/the-mirror-source.zip'],
            ].filter(([,url])=>report||!["/data/benchmark-raw.jsonl","/data/lora-adapter.zip","/data/the-mirror-source.zip"].includes(url)).map(([label,url])=><a key={url} href={url} download>{label}<ArrowUpRight size={15}/></a>)}
            <p className="method-note">{t.perspectiveNote}</p>
          </aside>
        </div>
      </section>
    </main>
    <footer><div className="container footer-inner"><Logo footer/><p>{t.foot}</p><a href="#lab">{t.nav[0]}</a></div></footer>

    <dialog ref={dialog} className="settings-dialog" onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
      <form onSubmit={e=>{e.preventDefault();setSettings(draft);dialog.current?.close();}}>
        <div className="dialog-top"><h2>{t.configure}</h2><button type="button" className="icon-button" aria-label={t.close} onClick={()=>dialog.current?.close()}><X size={19}/></button></div>
        <p>{t.configureCopy}</p>
        <label>{t.endpoint}<input value={draft.endpoint} onChange={e=>setDraft({...draft,endpoint:e.target.value})} type="url" required/></label>
        <label>{t.protocol}<select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value as Settings['source']})}><option value="local">{lang==='zh'?'本地模型':'Local model'}</option><option value="api">{t.models.api}</option></select></label>
        {draft.source==='api' && <>
          <label>{t.apiEndpoint}<input value={draft.apiEndpoint} onChange={e=>setDraft({...draft,apiEndpoint:e.target.value})} type="url" required/></label>
          <label>{t.apiModel}<input value={draft.apiModel} onChange={e=>setDraft({...draft,apiModel:e.target.value})} required/></label>
          <label>{t.apiKey}<input value={draft.apiKey} onChange={e=>setDraft({...draft,apiKey:e.target.value})} type="password" autoComplete="off"/></label>
          <p className="method-note">{t.secret}</p>
        </>}
        <div className="dialog-actions"><button className="outline" type="button" onClick={()=>dialog.current?.close()}>{t.cancel}</button><button className="solid" type="submit"><Check size={16}/>{t.save}</button></div>
      </form>
    </dialog>
  </>;
}
