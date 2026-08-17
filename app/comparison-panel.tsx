"use client";
import { useMemo, useState } from "react";

type Row={flow:string;year:number;section?:number;month?:number;period?:number;index:number|null;coverage:number};
type Data={sections:{id:number;roman:string;name:string}[];annual:Row[];monthly:Row[];quarterly:Row[];semester:Row[]};
const colors:Record<string,string>={EXP:"#0d5b42",IMP:"#d5a431",GBL:"#3b63a4","2022":"#718079","2023":"#0d5b42","2024":"#d5a431","2025":"#3b63a4"};
const flowNames:Record<string,string>={EXP:"Exportações",IMP:"Importações",GBL:"Índice Global"};
const fmt=(n:number|null)=>n==null?"—":n.toLocaleString("pt-PT",{minimumFractionDigits:1,maximumFractionDigits:1});

export default function ComparisonPanel({data}:{data:Data}){
  const[type,setType]=useState("quarterly"),[year,setYear]=useState(2025),[section,setSection]=useState(0),[mode,setMode]=useState("flows"),[flow,setFlow]=useState("GBL");
  const source=type==="annual"?data.annual:type==="monthly"?data.monthly:type==="quarterly"?data.quarterly:data.semester;
  const periods=type==="annual"?[2022,2023,2024,2025]:type==="monthly"?[1,2,3,4,5,6,7,8,9,10,11,12]:type==="quarterly"?[1,2,3,4]:[1,2];
  const labels=type==="annual"?periods.map(String):type==="monthly"?["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]:periods.map(p=>type==="quarterly"?`${p}º Trim.`:`${p}º Sem.`);
  const series=useMemo(()=>{
    const keys=mode==="flows"?["EXP","IMP","GBL"]:["2022","2023","2024","2025"];
    return keys.map(key=>({key,name:mode==="flows"?flowNames[key]:key,values:periods.map(p=>{
      const y=type==="annual"?p:(mode==="flows"?year:+key); const f=mode==="flows"?key:flow;
      return source.find(r=>r.flow===f&&r.year===y&&r.section===(section||undefined)&&(type==="annual"|| (type==="monthly"?r.month===p:r.period===p)))?.index??null;
    })}));
  },[source,type,mode,year,flow,section,periods]);
  const all=series.flatMap(s=>s.values).filter((v):v is number=>v!=null),max=Math.max(120,...all),min=Math.min(50,...all);
  const x=(i:number)=>48+i*(604/Math.max(1,periods.length-1)),y=(v:number)=>210-(v-min)/(max-min||1)*155;
  return <section id="comparar" className="compare-section"><div className="compare-head"><div><span>COMPARAÇÃO MULTIDIMENSIONAL</span><h2>Compare períodos, fluxos e grupos</h2><p>Seleccione a periodicidade e confronte Exportações, Importações e Índice Global, ou compare a evolução entre anos.</p></div><div className="mode"><button className={mode==="flows"?"active":""} onClick={()=>setMode("flows")}>Comparar fluxos</button><button className={mode==="years"?"active":""} onClick={()=>setMode("years")}>Comparar anos</button></div></div>
    <div className="compare-filters"><label>Periodicidade<select value={type} onChange={e=>setType(e.target.value)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option><option value="semester">Semestral</option><option value="annual">Anual</option></select></label>{type!=="annual"&&mode==="flows"&&<label>Ano<select value={year} onChange={e=>setYear(+e.target.value)}>{[2022,2023,2024,2025].map(v=><option key={v}>{v}</option>)}</select></label>}{mode==="years"&&<label>Fluxo<select value={flow} onChange={e=>setFlow(e.target.value)}><option value="GBL">Índice Global</option><option value="EXP">Exportações</option><option value="IMP">Importações</option></select></label>}<label>Grupo<select value={section} onChange={e=>setSection(+e.target.value)}><option value="0">Índice geral</option>{data.sections.map(s=><option value={s.id} key={s.id}>{s.roman} — {s.name}</option>)}</select></label></div>
    <div className="compare-card"><div className="legend">{series.map(s=><span key={s.key}><i style={{background:colors[s.key]}}/>{s.name}</span>)}</div><svg viewBox="0 0 700 260" aria-label="Gráfico comparativo">{[0,1,2,3].map(i=><line key={i} x1="48" x2="652" y1={55+i*52} y2={55+i*52} className="c-grid"/>)}{series.map(s=><g key={s.key}><path d={s.values.map((v,i)=>v==null?"":`${i?"L":"M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={colors[s.key]} strokeWidth="3"/>{s.values.map((v,i)=>v==null?null:<g key={i}><circle cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke={colors[s.key]} strokeWidth="2"/><text x={x(i)} y={y(v)-9}>{fmt(v)}</text></g>)}</g>)}{labels.map((l,i)=><text key={l} x={x(i)} y="244" className="c-axis">{l}</text>)}</svg><div className="compare-table"><table><thead><tr><th>Período</th>{series.map(s=><th key={s.key}>{s.name}</th>)}</tr></thead><tbody>{labels.map((l,i)=><tr key={l}><td>{l}</td>{series.map(s=><td key={s.key}>{fmt(s.values[i])}</td>)}</tr>)}</tbody></table></div></div>
  </section>
}
