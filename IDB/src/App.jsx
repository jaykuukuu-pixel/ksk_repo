import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";

const ORANGE = "#E8572A";
const ORANGE_LIGHT = "#FFF0EB";
const ORANGE_MID  = "#F0997B";
const PEER_FILL   = "#D3D1C7";

// ── All from SEPARATE financial statements (งบการเงินเฉพาะกิจการ) FY2025 ──
// Monetary: THB millions | Ratios: %
// Combined  = Insurance Service Expenses / Revenue (gross, before reinsurance)
// profitGross = Direct ISR / Revenue = 1 - combined/100
// profitNet   = Total ISR / Revenue  (after reinsurance)
// reinsCostR  = Net Reins Expense / Revenue (+ve = cost, -ve = income)
// acqRatio    = Acquisition amortisation / Revenue
// lossExpR    = Incurred claims / Revenue (excl. acquisition)
// opexRatio   = Operating expenses / Revenue
// BHI: revenue in raw THB (3.162M THB), stored as 0.003162M here
const C = {
  AIOI:      { name:"Aioi Bangkok",    rev:7200.6,  isr:195.6,    net:108.2,    combined:97.28,  profitGross:2.72,   profitNet:2.72,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  AXA:       { name:"AXA Insurance",   rev:6541.4,  isr:-55.2,    net:-158.6,   combined:100.84, profitGross:-0.84,  profitNet:-0.84,  reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  BHI:       { name:"Bangkok Health",  rev:0.003162,isr:0.001446, net:0.001525, combined:54.29,  profitGross:45.71,  profitNet:45.71,  reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  BKI:       { name:"Bangkok Ins.",    rev:29458.0, isr:null,     net:3129.3,   combined:null,   profitGross:null,   profitNet:null,   reinsCostR:null,   acqRatio:22.94, lossExpR:86.81, opexRatio:0.35  },
  BUI:       { name:"Bangkok Union",   rev:1311.6,  isr:98.5,     net:71.0,     combined:92.49,  profitGross:7.51,   profitNet:7.51,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  Charan:    { name:"Charan Ins.",     rev:445.1,   isr:51.5,     net:30.7,     combined:88.42,  profitGross:11.58,  profitNet:11.58,  reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  DHP:       { name:"Dhipaya",         rev:33280.1, isr:1521.9,   net:null,     combined:81.28,  profitGross:18.72,  profitNet:4.57,   reinsCostR:14.14,  acqRatio:13.74, lossExpR:66.96, opexRatio:2.90  },
  DVS:       { name:"Deves Ins.",      rev:6888.1,  isr:589.2,    net:null,     combined:91.45,  profitGross:8.55,   profitNet:8.55,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  GTI:       { name:"Generali Thai",   rev:1377.5,  isr:17.5,     net:8.4,      combined:98.73,  profitGross:1.27,   profitNet:1.27,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  INSURE:    { name:"Indara Ins.",      rev:5749.0,  isr:285.8,    net:22.3,     combined:95.03,  profitGross:4.97,   profitNet:4.97,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  Insurverse:{ name:"Insurverse",      rev:189.5,   isr:-6.3,     net:-49.8,    combined:103.34, profitGross:-3.34,  profitNet:-3.34,  reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  MIT:       { name:"Mittare Ins.",    rev:4438.9,  isr:629.9,    net:170.2,    combined:92.65,  profitGross:7.35,   profitNet:14.19,  reinsCostR:-6.84,  acqRatio:31.41, lossExpR:64.04, opexRatio:7.18  },
  MSIG:      { name:"MSIG Thailand",   rev:5660.3,  isr:248.5,    net:223.5,    combined:95.61,  profitGross:4.39,   profitNet:4.39,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  NKI:       { name:"Navakij Ins.",    rev:3543.2,  isr:-670.5,   net:-586.2,   combined:118.92, profitGross:-18.92, profitNet:-18.92, reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:null  },
  ROOJAI:    { name:"Roojai",          rev:1353.8,  isr:-16.2,    net:-102.3,   combined:101.20, profitGross:-1.20,  profitNet:-1.20,  reinsCostR:0.12,   acqRatio:null,  lossExpR:null,  opexRatio:7.06  },
  RVP:       { name:"RVP",             rev:5418.8,  isr:-1591.8,  net:-1008.3,  combined:129.38, profitGross:-29.38, profitNet:-29.38, reinsCostR:0.00,   acqRatio:3.38,  lossExpR:90.88, opexRatio:9.26  },
  SMI:       { name:"Siam Smile",      rev:236.3,   isr:157.4,    net:119.9,    combined:33.38,  profitGross:66.62,  profitNet:66.62,  reinsCostR:0.05,   acqRatio:null,  lossExpR:null,  opexRatio:15.28 },
  SOMPO:     { name:"Sompo Thailand",  rev:3470.7,  isr:-83.1,    net:-472.7,   combined:91.52,  profitGross:8.48,   profitNet:-2.39,  reinsCostR:10.87,  acqRatio:24.11, lossExpR:82.24, opexRatio:14.84 },
  Sunday:    { name:"Sunday Ins.",     rev:535.9,   isr:85.7,     net:53.3,     combined:84.01,  profitGross:15.99,  profitNet:15.99,  reinsCostR:-2.98,  acqRatio:24.48, lossExpR:44.09, opexRatio:13.36 },
  THRE:      { name:"Thai Re",         rev:2764.2,  isr:53.0,     net:19.0,     combined:131.06, profitGross:-31.06, profitNet:1.92,   reinsCostR:-33.00, acqRatio:8.48,  lossExpR:122.58,opexRatio:6.05  },
  TMSTH:     { name:"Tokio Marine",    rev:20923.5, isr:2255.8,   net:1922.9,   combined:91.61,  profitGross:8.39,   profitNet:10.78,  reinsCostR:-2.39,  acqRatio:28.23, lossExpR:68.89, opexRatio:0.87  },
  TNI:       { name:"Thanachart Ins.", rev:11794.9, isr:1231.2,   net:1076.9,   combined:92.94,  profitGross:7.06,   profitNet:10.44,  reinsCostR:-3.38,  acqRatio:29.92, lossExpR:65.44, opexRatio:3.95  },
  TSI:       { name:"Thai Setakij",    rev:1187.9,  isr:50.2,     net:10.8,     combined:95.78,  profitGross:4.22,   profitNet:4.22,   reinsCostR:null,   acqRatio:null,  lossExpR:null,  opexRatio:5.08  },
  TVI:       { name:"Thaivivat",       rev:7641.2,  isr:970.2,    net:526.5,    combined:87.70,  profitGross:12.30,  profitNet:12.70,  reinsCostR:-0.39,  acqRatio:21.04, lossExpR:64.97, opexRatio:6.25  },
  ThaiHealth:{ name:"Thai Health",     rev:844.7,   isr:83.0,     net:59.1,     combined:90.18,  profitGross:9.82,   profitNet:9.82,   reinsCostR:0.01,   acqRatio:39.64, lossExpR:38.89, opexRatio:3.19  },
  Union:     { name:"Union Ins.",      rev:32.7,    isr:6.6,      net:-0.1,     combined:79.74,  profitGross:20.26,  profitNet:20.26,  reinsCostR:18.33,  acqRatio:35.04, lossExpR:27.93, opexRatio:28.49 },
};

const ALL_COS = Object.keys(C);
const NO_DATA = ["KPI","TPI"];

const avgOf = key => { const v=ALL_COS.map(c=>C[c][key]).filter(x=>x!=null&&isFinite(x)); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; };
const IND = {};
["rev","isr","net","combined","profitGross","profitNet","reinsCostR","acqRatio","lossExpR","opexRatio"].forEach(k=>{ IND[k]=avgOf(k); });

const fmtM = v => v==null?"—":Math.abs(v)>=1000?(v/1000).toFixed(1)+"B":Math.abs(v)<1?v.toFixed(3)+"M":v.toFixed(0)+"M";
const fmtP = v => v==null?"—":v.toFixed(1)+"%";
const tt = { fontSize:11, border:"0.5px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)" };
const ax = { fontSize:10, fill:"var(--color-text-tertiary)" };

const TABS = [
  { id:"overview",   label:"Overview"        },
  { id:"profitability", label:"Profitability" },
  { id:"costs",      label:"Cost ratios"     },
  { id:"scale",      label:"Scale"           },
  { id:"scatter",    label:"Performance map" },
];

const METRICS = {
  combined:     { label:"Combined ratio",         unit:"%", lower:true,  desc:"Service expenses / revenue" },
  profitGross:  { label:"Profit margin (gross)",  unit:"%", lower:false, desc:"Direct ISR / revenue, before reinsurance" },
  profitNet:    { label:"Profit margin (net)",    unit:"%", lower:false, desc:"Total ISR / revenue, after reinsurance" },
  acqRatio:     { label:"Acquisition cost ratio", unit:"%", lower:true,  desc:"Acquisition amortisation / revenue" },
  lossExpR:     { label:"Loss & expense ratio",   unit:"%", lower:true,  desc:"Incurred claims / revenue" },
  reinsCostR:   { label:"Reinsurance cost ratio", unit:"%", lower:true,  desc:"+ve = net cost, -ve = net income" },
  opexRatio:    { label:"Operating expense ratio",unit:"%", lower:true,  desc:"Operating expenses / revenue" },
};

export default function Dashboard() {
  const [focus,  setFocus]  = useState("TMSTH");
  const [peers,  setPeers]  = useState(ALL_COS.filter(c=>c!=="TMSTH"));
  const [tab,    setTab]    = useState("overview");
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState("combined");

  useEffect(()=>{
    (async()=>{ try{ const r=await window.storage.get("ins25_v2"); if(r){const p=JSON.parse(r.value);if(p.focus)setFocus(p.focus);if(p.peers)setPeers(p.peers);} }catch(e){} })();
  },[]);

  const save = async(fc,ps)=>{ try{ await window.storage.set("ins25_v2",JSON.stringify({focus:fc,peers:ps})); }catch(e){} };
  const chFocus = co=>{ const np=ALL_COS.filter(c=>c!==co); setFocus(co); setPeers(np); save(co,np); };
  const togPeer = co=>{ if(co===focus)return; const np=peers.includes(co)?peers.filter(p=>p!==co):[...peers,co]; setPeers(np); save(focus,np); };

  const visible = [focus,...peers.filter(p=>p!==focus)];
  const fc = C[focus];

  const bData = key => visible.map(co=>({name:co,co,value:C[co][key]})).filter(d=>d.value!=null&&isFinite(d.value));
  const fill  = co  => co===focus ? ORANGE : PEER_FILL;

  const Tip = ({active,payload})=>{
    if(!active||!payload||!payload.length) return null;
    const d=payload[0].payload;
    const nm = C[d.co] ? C[d.co].name : d.co;
    return <div style={{...tt,padding:"8px 12px"}}>
      <p style={{margin:"0 0 2px",fontWeight:500,fontSize:12}}>{d.co} — {nm}</p>
      {payload.map((p,i)=><p key={i} style={{margin:0,fontSize:11}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</p>)}
    </div>;
  };

  const Card = ({title,sub,children,col2})=>(
    <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"14px 16px",gridColumn:col2?"span 2":undefined}}>
      <p style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",margin:sub?"0 0 2px":"0 0 12px"}}>{title}</p>
      {sub&&<p style={{fontSize:11,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>{sub}</p>}
      {children}
    </div>
  );

  const Bars = ({metric:m,height=185,unit="%",noRef})=>{
    const data=bData(m); const ref=noRef?null:IND[m];
    return <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{top:18,right:65,left:-10,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false}/>
        <XAxis dataKey="name" tick={ax} axisLine={false} tickLine={false}/>
        <YAxis tick={ax} axisLine={false} tickLine={false} unit={unit}/>
        <Tooltip content={<Tip/>}/>
        {ref!=null&&<ReferenceLine y={ref} stroke="#B4B2A9" strokeDasharray="4 4" label={{value:"Avg "+ref.toFixed(1)+unit,position:"right",fontSize:9,fill:"#888"}}/>}
        <Bar dataKey="value" name={m} radius={[3,3,0,0]} maxBarSize={44}
          label={{position:"top",fontSize:9,fill:"var(--color-text-secondary)",formatter:v=>v!=null?v.toFixed(1)+unit:""}}>
          {data.map(d=><Cell key={d.co} fill={fill(d.co)}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>;
  };

  const TabBtn = ({id,label})=>(
    <button onClick={()=>setTab(id)} style={{padding:"6px 14px",borderRadius:20,border:"0.5px solid",cursor:"pointer",fontSize:12,fontWeight:500,
      background:tab===id?ORANGE:"var(--color-background-primary)",
      borderColor:tab===id?ORANGE:"var(--color-border-tertiary)",
      color:tab===id?"#fff":"var(--color-text-secondary)"}}>
      {label}
    </button>
  );

  const MiniBtn = ({id,label,state,setState})=>(
    <button onClick={()=>setState(id)} style={{padding:"4px 10px",borderRadius:14,border:"0.5px solid",cursor:"pointer",fontSize:11,
      background:state===id?ORANGE_LIGHT:"var(--color-background-primary)",
      borderColor:state===id?ORANGE_MID:"var(--color-border-tertiary)",
      color:state===id?"#993C1D":"var(--color-text-secondary)"}}>
      {label}
    </button>
  );

  const filtered = ALL_COS.filter(co=>!search||C[co].name.toLowerCase().includes(search.toLowerCase())||co.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{fontFamily:"var(--font-sans)",background:"var(--color-background-tertiary)",minHeight:"100vh"}}>

      <div style={{background:ORANGE,padding:"12px 24px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{background:"#fff",borderRadius:4,padding:"3px 8px",fontWeight:700,fontSize:12,color:ORANGE,letterSpacing:1}}>PwC</div>
        <span style={{color:"#fff",fontWeight:500,fontSize:14}}>Thailand insurance benchmarking</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:12}}>TFRS 17</span>
          <span style={{background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:12}}>Separate statements</span>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{ALL_COS.length} companies · FY2025</span>
        </div>
      </div>

      <div style={{padding:"16px 20px",maxWidth:1000,margin:"0 auto"}}>

        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"14px 18px",marginBottom:12}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start"}}>
            <div>
              <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"0 0 7px",fontWeight:500,letterSpacing:1}}>YOUR COMPANY</p>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{fontSize:12,padding:"5px 10px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",width:150,display:"block",marginBottom:8}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,maxWidth:400}}>
                {filtered.map(co=>(
                  <button key={co} onClick={()=>chFocus(co)} style={{padding:"4px 9px",borderRadius:6,border:"0.5px solid",cursor:"pointer",fontSize:11,fontWeight:500,
                    background:focus===co?ORANGE:"var(--color-background-primary)",
                    borderColor:focus===co?ORANGE:"var(--color-border-secondary)",
                    color:focus===co?"#fff":"var(--color-text-secondary)"}}>
                    {co}
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:1,minWidth:260}}>
              <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"0 0 7px",fontWeight:500,letterSpacing:1}}>BENCHMARK PEERS</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {ALL_COS.filter(co=>co!==focus).map(co=>(
                  <button key={co} onClick={()=>togPeer(co)} style={{padding:"4px 9px",borderRadius:6,border:"0.5px solid",cursor:"pointer",fontSize:11,fontWeight:500,
                    background:peers.includes(co)?ORANGE_LIGHT:"var(--color-background-primary)",
                    borderColor:peers.includes(co)?ORANGE_MID:"var(--color-border-secondary)",
                    color:peers.includes(co)?"#993C1D":"var(--color-text-tertiary)"}}>
                    {co}
                  </button>
                ))}
              </div>
              <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"9px 0 0"}}>No FY2025 data: {NO_DATA.join(", ")} · KPI: OCR garbled · BHI: raw THB units</p>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {TABS.map(t=><TabBtn key={t.id} id={t.id} label={t.label}/>)}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {[
                {label:"Revenue",           val:fmtM(fc.rev),                  up:true,  diff:fc.rev?((fc.rev-IND.rev)/Math.abs(IND.rev)*100).toFixed(0)+"% vs avg":null},
                {label:"ISR (service result)", val:fmtM(fc.isr),               up:fc.isr>0, diff:fc.isr!=null?fmtM(fc.isr-IND.isr)+" vs avg":null},
                {label:"Combined ratio",    val:fmtP(fc.combined),             up:fc.combined<IND.combined, diff:fc.combined!=null?(fc.combined-IND.combined).toFixed(1)+"pp vs avg":null},
                {label:"Profit margin (net)", val:fmtP(fc.profitNet),          up:fc.profitNet>IND.profitNet, diff:fc.profitNet!=null?(fc.profitNet-IND.profitNet).toFixed(1)+"pp vs avg":null},
              ].map(({label,val,up,diff},i)=>(
                <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
                  <p style={{fontSize:11,color:"var(--color-text-secondary)",margin:"0 0 4px"}}>{label}</p>
                  <p style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 2px"}}>{val}</p>
                  {diff&&<p style={{fontSize:11,margin:0,color:up?"var(--color-text-success)":"var(--color-text-danger)"}}>{up?"↑":"↓"} {diff}</p>}
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Card title="Insurance service result (THB M)" sub="Total ISR from separate statements">
                <Bars metric="isr" unit="M" height={200} noRef/>
              </Card>
              <Card title="Net profit / (loss) (THB M)">
                <Bars metric="net" unit="M" height={200} noRef/>
              </Card>
            </div>
          </>
        )}

        {/* ── PROFITABILITY ── */}
        {tab==="profitability"&&(
          <>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {Object.entries(METRICS).filter(([k])=>["combined","profitGross","profitNet"].includes(k)).map(([k,m])=>(
                <MiniBtn key={k} id={k} label={m.label} state={metric} setState={setMetric}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Card title={METRICS[metric].label} sub={METRICS[metric].desc} col2>
                <Bars metric={metric}/>
              </Card>
              <Card title="Gross vs net profit margin — focus company">
                <div style={{marginTop:8}}>
                  {[["profitGross","Gross (before reinsurance)"],["profitNet","Net (after reinsurance)"]].map(([k,lbl])=>{
                    const v=fc[k]; const ind=IND[k];
                    if(v==null) return <p key={k} style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 8px"}}>{lbl}: —</p>;
                    const w=Math.max(0,Math.min(100,(v+35)/100*100));
                    return <div key={k} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                        <span style={{color:"var(--color-text-secondary)"}}>{lbl}</span>
                        <span style={{fontWeight:500,color:v>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{v.toFixed(1)}%</span>
                      </div>
                      <div style={{height:8,background:"var(--color-background-secondary)",borderRadius:4,overflow:"hidden",position:"relative"}}>
                        <div style={{position:"absolute",top:0,bottom:0,width:2,background:"var(--color-border-secondary)",left:Math.max(0,Math.min(100,(-35+35)/100*100+"%"))}}/>
                        <div style={{height:"100%",width:w+"%",background:k==="profitNet"?ORANGE:PEER_FILL,borderRadius:4,transition:"width .3s"}}/>
                      </div>
                      <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"3px 0 0"}}>Industry avg: {ind!=null?ind.toFixed(1)+"%":"—"}</p>
                    </div>;
                  })}
                </div>
              </Card>
              <Card title="Top companies by net profit margin">
                <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:4}}>
                  {ALL_COS.filter(co=>C[co].profitNet!=null).sort((a,b)=>C[b].profitNet-C[a].profitNet).slice(0,10).map((co,i)=>{
                    const v=C[co].profitNet; const w=Math.max(0,Math.min(100,(v+30)/100*100));
                    return <div key={co}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co} — {C[co].name}</span>
                        <span style={{color:v>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{v.toFixed(1)}%</span>
                      </div>
                      <div style={{height:5,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:w+"%",background:co===focus?ORANGE:"#9FE1CB",borderRadius:3}}/>
                      </div>
                    </div>;
                  })}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── COST RATIOS ── */}
        {tab==="costs"&&(
          <>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {Object.entries(METRICS).filter(([k])=>["acqRatio","lossExpR","reinsCostR","opexRatio"].includes(k)).map(([k,m])=>(
                <MiniBtn key={k} id={k} label={m.label} state={metric} setState={setMetric}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Card title={METRICS[metric].label} sub={METRICS[metric].desc} col2>
                <Bars metric={metric}/>
              </Card>

              {/* Side-by-side stacked comparison for companies with full breakdown */}
              <Card title="Cost breakdown — companies with full data" sub="Stacked: claims + acquisition + reinsurance + OPEX" col2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={visible.filter(co=>C[co].lossExpR!=null&&C[co].acqRatio!=null).map(co=>({
                      name:co, co,
                      Claims:   parseFloat(C[co].lossExpR.toFixed(1)),
                      Acquisition: parseFloat(C[co].acqRatio.toFixed(1)),
                      Reinsurance: C[co].reinsCostR!=null?parseFloat(C[co].reinsCostR.toFixed(1)):0,
                      OPEX:     C[co].opexRatio!=null?parseFloat(C[co].opexRatio.toFixed(1)):0,
                    }))}
                    margin={{top:10,right:20,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false}/>
                    <XAxis dataKey="name" tick={ax} axisLine={false} tickLine={false}/>
                    <YAxis tick={ax} axisLine={false} tickLine={false} unit="%"/>
                    <Tooltip contentStyle={tt} formatter={(v,name)=>[v.toFixed(1)+"%",name]}/>
                    <Bar dataKey="Claims"      stackId="a" fill="#F0997B"/>
                    <Bar dataKey="Acquisition" stackId="a" fill={ORANGE}/>
                    <Bar dataKey="Reinsurance" stackId="a" fill="#B4B2A9"/>
                    <Bar dataKey="OPEX"        stackId="a" fill="#D3D1C7" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
                  {[["#F0997B","Claims"],["#E8572A","Acquisition"],["#B4B2A9","Reinsurance cost"],["#D3D1C7","OPEX"]].map(([c,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--color-text-secondary)"}}>
                      <div style={{width:10,height:10,borderRadius:2,background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── SCALE ── */}
        {tab==="scale"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card title="Insurance revenue (THB M)" sub="Sorted by size — separate statements" col2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bData("rev").filter(d=>d.value>0.01).sort((a,b)=>b.value-a.value)} margin={{top:18,right:70,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false}/>
                  <XAxis dataKey="name" tick={ax} axisLine={false} tickLine={false}/>
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"B":v}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="value" name="Revenue" radius={[3,3,0,0]} maxBarSize={40}
                    label={{position:"top",fontSize:9,fill:"var(--color-text-secondary)",formatter:v=>v>=1000?(v/1000).toFixed(1)+"B":v.toFixed(0)+"M"}}>
                    {bData("rev").filter(d=>d.value>0.01).sort((a,b)=>b.value-a.value).map(d=><Cell key={d.co} fill={fill(d.co)}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="All companies by revenue">
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ALL_COS.filter(co=>C[co].rev>0.01).sort((a,b)=>C[b].rev-C[a].rev).map((co,i)=>{
                  const maxR=C["DHP"].rev; const pct=C[co].rev/maxR*100;
                  return <div key={co} style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:10,color:"var(--color-text-tertiary)",width:16,textAlign:"right"}}>{i+1}</span>
                    <span style={{fontSize:11,width:84,flexShrink:0,fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co}</span>
                    <div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:co===focus?ORANGE:PEER_FILL,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--color-text-secondary)",width:54,textAlign:"right"}}>{fmtM(C[co].rev)}</span>
                  </div>;
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── SCATTER ── */}
        {tab==="scatter"&&(
          <Card title="Performance map" sub="Combined ratio (x, lower=better) vs profit margin net (y, higher=better) — your company in orange">
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{top:10,right:20,left:0,bottom:24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)"/>
                <XAxis dataKey="x" name="Combined ratio" unit="%" tick={ax} axisLine={false} tickLine={false}
                  label={{value:"Combined ratio % (lower is better →)",position:"insideBottom",offset:-14,fontSize:10,fill:"var(--color-text-tertiary)"}}/>
                <YAxis dataKey="y" name="Profit net" unit="%" tick={ax} axisLine={false} tickLine={false}
                  label={{value:"Net profit margin %",angle:-90,position:"insideLeft",offset:10,fontSize:10,fill:"var(--color-text-tertiary)"}}/>
                <ReferenceLine y={0} stroke="#F09595" strokeDasharray="3 3"/>
                <ReferenceLine x={100} stroke="#F09595" strokeDasharray="3 3"/>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload||!payload.length) return null;
                  const d=payload[0].payload;
                  return <div style={{...tt,padding:"8px 12px"}}>
                    <p style={{margin:"0 0 2px",fontWeight:500,fontSize:12}}>{d.co} — {C[d.co].name}</p>
                    <p style={{margin:0,fontSize:11}}>Combined: {d.x!=null?d.x.toFixed(1)+"%" :"—"}</p>
                    <p style={{margin:0,fontSize:11}}>Net margin: {d.y!=null?d.y.toFixed(1)+"%" :"—"}</p>
                    <p style={{margin:0,fontSize:11}}>Revenue: {fmtM(C[d.co].rev)}</p>
                  </div>;
                }}/>
                <Scatter
                  data={visible.filter(co=>C[co].combined!=null&&C[co].profitNet!=null).map(co=>({
                    co, x:C[co].combined, y:C[co].profitNet
                  }))}
                  shape={({cx,cy,payload})=>{
                    const isFocus=payload.co===focus;
                    return <g>
                      <circle cx={cx} cy={cy} r={isFocus?10:6} fill={isFocus?ORANGE:PEER_FILL} opacity={0.85}/>
                      <text x={cx+12} y={cy+4} fontSize={10} fill="var(--color-text-secondary)">{payload.co}</text>
                    </g>;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <p style={{fontSize:11,color:"var(--color-text-tertiary)",margin:"8px 0 0"}}>Top-left quadrant (low combined ratio, high profit margin) = best position. Red lines mark the break-even axes.</p>
          </Card>
        )}

        <div style={{marginTop:20,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Source: NotebookLM · NL_Insurance_FS_2025 · Separate financial statements (งบการเงินเฉพาะกิจการ) · FY2025</span>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>© 2026 PwC Thailand</span>
        </div>
      </div>
    </div>
  );
}
