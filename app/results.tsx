'use client';
import {Fragment, useMemo} from 'react';
import {motion, MotionConfig} from 'framer-motion';
import {ArrowDownToLine, Check, Code2, Eye, ScanLine} from 'lucide-react';
import {scaleLinear} from 'd3';
import {Benchmark, Branch, copy, Lang, metrics, Run, variants} from './data';

function tokens(text:string, lang:Lang) {
  return [...new Intl.Segmenter(lang,{granularity:'word'}).segment(text)];
}
function words(text:string, lang:Lang) {
  return new Set(tokens(text,lang).filter(x=>x.isWordLike).map(x=>x.segment.toLowerCase()));
}
function overlap(left:Set<string>, right:Set<string>) {
  const union = new Set([...left,...right]).size;
  return union ? [...left].filter(x=>right.has(x)).length / union : 1;
}
function sentences(text:string, lang:Lang) {
  const display = text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^(?:#{1,6} |[-] )/gm,'').replace(/`([^`]+)`/g,'$1');
  return [...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(display)].map(x=>x.segment.trim()).filter(Boolean);
}

function align(left:string[], right:string[], lang:Lang) {
  const l = left.map(x=>words(x,lang)), r = right.map(x=>words(x,lang));
  if (l.length*r.length > 20000) return Array.from({length:Math.max(l.length,r.length)},(_,i)=>[left[i]??'',right[i]??'']);
  const score = Array.from({length:l.length+1},()=>new Float64Array(r.length+1));
  for (let i=l.length-1;i>=0;i--) {
    for (let j=r.length-1;j>=0;j--) {
      score[i][j] = Math.max(score[i+1][j],score[i][j+1],overlap(l[i],r[j])-.17+score[i+1][j+1]);
    }
  }
  const rows:string[][] = [];
  let i=0,j=0;
  while(i<l.length || j<r.length) {
    if(i<l.length && j<r.length && score[i][j] === overlap(l[i],r[j])-.17+score[i+1][j+1]) {
      rows.push([left[i++],right[j++]]);
    } else if(i<l.length && (j===r.length || score[i][j]===score[i+1][j])) {
      rows.push([left[i++],'']);
    } else {
      rows.push(['',right[j++]]);
    }
  }
  return rows;
}

function Marked({text, lang, common, tone, enabled}:{text:string;lang:Lang;common:Set<string>;tone:number;enabled:boolean}) {
  if (!enabled) return <>{text}</>;
  return <>{tokens(text,lang).map(({segment,isWordLike,index})=>
    isWordLike && !common.has(segment.toLowerCase())
      ? <mark className={`tone-${tone}`} key={index}>{segment}</mark>
      : <Fragment key={index}>{segment}</Fragment>
  )}</>;
}

function saveJSON(run:Run, choice:number|null) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({...run,blind_choice:choice},null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href=url;
  link.download=`mirror-${run.id}.json`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function Results({run, lang, mirror, highlight, onHighlight, order, choice, onChoice, revealed, onReveal}:{
  run:Run;lang:Lang;mirror:boolean;highlight:boolean;onHighlight:()=>void;
  order:number[];choice:number|null;onChoice:(n:number)=>void;revealed:boolean;onReveal:()=>void
}) {
  const t=copy[lang];
  const hidden=run.mode==='blind' && !revealed;
  const sequence=run.mode==='blind' ? order : [0,1,2];
  const counts = useMemo(()=>run.branches.map(branch=>words(branch.response,run.language)),[run]);
  const common = useMemo(()=>new Set([...counts[0]].filter(x=>counts.every(list=>list.has(x)))),[counts]);
  const rows = useMemo(()=>mirror && !hidden ? align(sentences(run.branches[0].response,run.language),sentences(run.branches[2].response,run.language),run.language):[],[mirror,hidden,run]);
  const similarity=Math.round(100*(overlap(counts[0],counts[1])+overlap(counts[0],counts[2])+overlap(counts[1],counts[2]))/3);
  const color = (index:number) => hidden || run.mode==='blind' ? 1 : index;
  const label = (branch:Branch, i:number) => hidden ? (lang==='zh' ? `回答 ${'ABC'[i]}` : `Answer ${'ABC'[i]}`) : branch.label;
  return <MotionConfig reducedMotion="user"><section className="results" aria-labelledby="responses-heading">
    <div className="result-top">
      <div><p className="micro dark"><span className="dot"/>{run.origin==='replay'?t.replayTag:t.liveTag}</p><h3 id="responses-heading">{t.responses}</h3></div>
      <div className="result-tools">
        {(!run.expected && !hidden) && <span className="overlap"><ScanLine size={15}/>{t.lexical} {similarity}%</span>}
        <label className="checkbox"><input type="checkbox" checked={highlight} onChange={onHighlight}/>{t.highlight}</label>
        {!hidden && <button className="quiet" onClick={()=>saveJSON(run,choice)}><ArrowDownToLine size={15}/>{t.export}</button>}
      </div>
    </div>
    {mirror && !hidden && run.mode!=='blind'
      ? <div className="mirror-board">
          <div className="mirror-header"><span>{run.branches[0].label}</span><span>{run.branches[2].label}</span></div>
          <div className="mirror-pairs">
            {rows.map((pair,i)=><div className="mirror-row" key={i}>
              {pair.map((text,j)=><motion.p key={j} initial={{opacity:0,x:j? -10:10}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*.08,1),duration:.35}}>
                <Marked text={text} lang={run.language} common={common} tone={j*2} enabled={highlight}/>
              </motion.p>)}
            </div>)}
          </div>
          <details className="mirror-neutral"><summary>{run.branches[1].label}</summary><p>{run.branches[1].response}</p></details>
        </div>
      : <div className="answer-grid">
          {sequence.map((index,i)=>{
            const branch=run.branches[index];
            return <motion.article className={`answer tone-${color(index)}${choice===index?' selected':''}`} key={index} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.4,delay:i*.12}}>
              <div className="answer-head"><span className="dot"/><h4>{label(branch,i)}</h4>{choice===index && <span className="choice"><Check size={13}/>{t.picked}</span>}</div>
              {sentences(branch.response,run.language).map((sentence,j)=>
                <motion.span className="sentence" key={j} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:Math.min(j*.045+i*.06,.9),duration:.25}}>
                  <Marked text={sentence} lang={run.language} common={common} tone={color(index)} enabled={highlight && !hidden}/>{' '}
                </motion.span>
              )}
              {!hidden && run.expected && <div className="expected">{t.verified} <strong>{run.expected[index]}</strong></div>}
              {hidden && <button className="outline choose" onClick={()=>onChoice(index)}>{t.choose}</button>}
            </motion.article>;
          })}
        </div>}
    {hidden ? <div className="blind-footer"><span><Eye size={15}/>{t.hidden}</span><button className="quiet" onClick={onReveal}>{t.reveal}</button></div>
      : <details className="audit"><summary><Code2 size={17}/>{t.audit}</summary>
          <div className="audit-body">
            <p><strong>{run.model}</strong> · {t.models[run.variant]} · <time dateTime={run.time}>{new Date(run.time).toLocaleString(t.htmlLang)}</time></p>
            <pre>{JSON.stringify({parameters:run.parameters,runtime:run.runtime},null,2)}</pre>
            {run.branches.map((b,i)=><details key={i} className="audit-branch"><summary>{b.label}</summary>
              <h5>{t.promptLabel}</h5>
              <pre>{JSON.stringify(b.messages,null,2)}</pre>
              <h5>{t.responseLabel}</h5>
              <pre>{b.response}</pre>
            </details>)}
          </div>
        </details>}
    {!run.expected && <p className="method-note">{t.perspectiveNote}</p>}
  </section></MotionConfig>;
}

const palette=['#708057','#45463d','#963d32'];
export function BenchmarkChart({report,lang}:{report:Benchmark;lang:Lang}) {
  const t=copy[lang],x=scaleLinear().domain([0,1]).range([15,183]);
  return <>
    <div className="chart-key">{variants.map((v,i)=><span key={v}><i style={{background:palette[i]}}/>{t.models[v]}</span>)}</div>
    <div className="chart-scroll">
      <table className="chart"><thead><tr><th scope="col">{t.metric}</th>{variants.map(v=><th scope="col" key={v}>{t.models[v]}</th>)}</tr></thead>
      <tbody>{Object.entries(metrics).map(([key,name])=><tr key={key}><th scope="row">{name[lang==='zh'?0:1]}</th>
        {variants.map((v,i)=>{
          const m=report.variants[v]?.[key];
          return <td key={v}>{m?.rate!=null
            ? <><strong>{(100*m.rate).toFixed(1)}%</strong> <small>{m.unit==='mean'?`n=${m.n}`:`${m.hits}/${m.n}`}</small>
              <svg viewBox="0 0 198 18" role="img" aria-label={m.ci ? `95% CI: ${(m.ci[0]*100).toFixed(1)}–${(m.ci[1]*100).toFixed(1)}%`:''}>
                <line x1={15} x2={183} y1={9} y2={9} stroke="#ded9cd"/>
                {m.ci && <line x1={x(m.ci[0])} x2={x(m.ci[1])} y1={9} y2={9} stroke={palette[i]} strokeWidth={3}/>}
                <circle cx={x(m.rate)} cy={9} r={4.5} fill={palette[i]}/>
              </svg></>
            : <span>— <small>n={m?.n??0}</small></span>}</td>;
        })}
      </tr>)}</tbody></table>
    </div>
    <p className="method-note">{lang==='zh'? '事实性指标使用 95% Wilson 区间。开放题使用按题重抽样的 95% 百分位区间。' : 'Factual rates use 95% Wilson intervals. Wording differences use 95% percentile bootstrap intervals over questions.'}</p>
  </>;
}
