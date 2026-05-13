import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";

const ORANGE = "#E8572A";
const ORANGE_LIGHT = "#FFF0EB";
const ORANGE_MID  = "#F0997B";
const PEER_FILL   = "#D3D1C7";

// Full-year 2025 data sourced from NotebookLM (NL_Insurance_FS_2025)
// revenue / isr / netProfit in THB millions | ratios in %
// All figures from SEPARATE financial statements (FY2025)
// revenue/isr/netProfit in THB millions | ratios in %
// BHI: figures in raw THB (3.162M THB revenue — micro health insurer)
const COMPANIES = {
  AIOI:      { name:"Aioi Bangkok",    revenue:7200.6,   isr:195.6,    netProfit:108.2,    combined:97.28,  profitMargin:2.72,   netMargin:1.50   },
  AXA:       { name:"AXA Insurance",   revenue:6541.4,   isr:-55.2,    netProfit:-158.6,   combined:100.84, profitMargin:-0.84,  netMargin:-2.43  },
  BHI:       { name:"Bangkok Health",  revenue:0.003162, isr:0.001446, netProfit:0.001525, combined:54.29,  profitMargin:45.71,  netMargin:48.22  },
  BKI:       { name:"Bangkok Ins.",    revenue:29458.0,  isr:null,     netProfit:3129.3,   combined:null,   profitMargin:null,   netMargin:10.63  },
  BUI:       { name:"Bangkok Union",   revenue:1311.6,   isr:98.5,     netProfit:71.0,     combined:92.49,  profitMargin:7.51,   netMargin:5.41   },
  Charan:    { name:"Charan Ins.",     revenue:445.1,    isr:51.5,     netProfit:30.7,     combined:88.42,  profitMargin:11.58,  netMargin:6.89   },
  DHP:       { name:"Dhipaya",         revenue:33280.1,  isr:1521.9,   netProfit:null,     combined:95.43,  profitMargin:4.57,   netMargin:null   },
  DVS:       { name:"Deves Ins.",      revenue:6888.1,   isr:589.2,    netProfit:null,     combined:91.45,  profitMargin:8.55,   netMargin:null   },
  GTI:       { name:"Generali Thai",   revenue:1377.5,   isr:17.5,     netProfit:8.4,      combined:98.73,  profitMargin:1.27,   netMargin:0.61   },
  INSURE:    { name:"Indara Ins.",     revenue:5749.0,   isr:285.8,    netProfit:22.3,     combined:95.03,  profitMargin:4.97,   netMargin:0.39   },
  Insurverse:{ name:"Insurverse",      revenue:189.5,    isr:-6.3,     netProfit:-49.8,    combined:103.34, profitMargin:-3.34,  netMargin:-26.28 },
  MIT:       { name:"Mittare Ins.",    revenue:4438.9,   isr:629.9,    netProfit:170.2,    combined:85.81,  profitMargin:14.19,  netMargin:3.84   },
  MSIG:      { name:"MSIG Thailand",   revenue:5660.3,   isr:248.5,    netProfit:223.5,    combined:95.61,  profitMargin:4.39,   netMargin:3.95   },
  NKI:       { name:"Navakij Ins.",    revenue:3543.2,   isr:-670.5,   netProfit:-586.2,   combined:118.92, profitMargin:-18.92, netMargin:-16.54 },
  ROOJAI:    { name:"Roojai",          revenue:1353.8,   isr:-16.2,    netProfit:-102.3,   combined:101.20, profitMargin:-1.20,  netMargin:-7.56  },
  RVP:       { name:"RVP",             revenue:5418.8,   isr:-1591.8,  netProfit:-1008.3,  combined:129.38, profitMargin:-29.38, netMargin:-18.61 },
  SMI:       { name:"Siam Smile",      revenue:236.3,    isr:157.4,    netProfit:119.9,    combined:33.38,  profitMargin:66.62,  netMargin:50.74  },
  SOMPO:     { name:"Sompo Thailand",  revenue:3470.7,   isr:-83.1,    netProfit:-472.7,   combined:102.39, profitMargin:-2.39,  netMargin:-13.62 },
  Sunday:    { name:"Sunday Ins.",     revenue:535.9,    isr:85.7,     netProfit:53.3,     combined:84.01,  profitMargin:15.99,  netMargin:9.94   },
  THRE:      { name:"Thai Re",         revenue:2764.2,   isr:53.0,     netProfit:19.0,     combined:98.08,  profitMargin:1.92,   netMargin:0.69   },
  TMSTH:     { name:"Tokio Marine",    revenue:20923.5,  isr:2255.8,   netProfit:1922.9,   combined:89.22,  profitMargin:10.78,  netMargin:9.19   },
  TNI:       { name:"Thanachart Ins.", revenue:11794.9,  isr:1231.2,   netProfit:1076.9,   combined:89.56,  profitMargin:10.44,  netMargin:9.13   },
  TSI:       { name:"Thai Setakij",    revenue:1187.9,   isr:50.2,     netProfit:10.8,     combined:95.78,  profitMargin:4.22,   netMargin:0.91   },
  TVI:       { name:"Thaivivat",       revenue:7641.2,   isr:970.2,    netProfit:526.5,    combined:87.30,  profitMargin:12.70,  netMargin:6.89   },
  ThaiHealth:{ name:"Thai Health",     revenue:844.7,    isr:83.0,     netProfit:59.1,     combined:90.18,  profitMargin:9.82,   netMargin:7.00   },
  Union:     { name:"Union Ins.",      revenue:32.7,     isr:6.6,      netProfit:-0.1,     combined:79.74,  profitMargin:20.26,  netMargin:-0.31  },
};

const NO_DATA = ["KPI","TPI"];
const ALL_COS = Object.keys(COMPANIES);

// Compute industry averages (mean across available companies)
const avgOf = key => { const vals=ALL_COS.map(c=>COMPANIES[c][key]).filter(v=>v!=null); return vals.reduce((a,b)=>a+b,0)/vals.length; };
const IND = { revenue:avgOf("revenue"), isr:avgOf("isr"), netProfit:avgOf("netProfit"), combined:avgOf("combined"), profitMargin:avgOf("profitMargin"), netMargin:avgOf("netMargin") };

const fmtM = v => v==null?"—":Math.abs(v)>=1000?(v/1000).toFixed(1)+"B":v.toFixed(0)+"M";
const ttStyle = { fontSize:11, border:"0.5px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)" };
const ax = { fontSize:10, fill:"var(--color-text-tertiary)" };

export default function Dashboard() {
  const [focus,  setFocus]  = useState("TMSTH");
  const [peers,  setPeers]  = useState(ALL_COS.filter(c=>c!=="TMSTH"));
  const [tab,    setTab]    = useState("overview");
  const [search, setSearch] = useState("");

  useEffect(()=>{
    (async()=>{ try{ const r=await window.storage.get("ins25_prefs"); if(r){const p=JSON.parse(r.value);if(p.focus)setFocus(p.focus);if(p.peers)setPeers(p.peers);} }catch(e){} })();
  },[]);

  const save = async(fc,ps)=>{ try{ await window.storage.set("ins25_prefs",JSON.stringify({focus:fc,peers:ps})); }catch(e){} };
  const changeFocus = co=>{ const np=ALL_COS.filter(c=>c!==co); setFocus(co); setPeers(np); save(co,np); };
  const togglePeer  = co=>{ if(co===focus)return; const np=peers.includes(co)?peers.filter(p=>p!==co):[...peers,co]; setPeers(np); save(focus,np); };

  const visible = [focus,...peers.filter(p=>p!==focus)];
  const fc = COMPANIES[focus];

  const barData = key => visible.map(co=>({name:co,co,value:COMPANIES[co][key]})).filter(d=>d.value!=null);
  const fill    = co  => co===focus ? ORANGE : PEER_FILL;

  const Tip = ({active,payload})=>{
    if(!active||!payload||!payload.length) return null;
    const d=payload[0].payload;
    const coName = COMPANIES[d.co] ? COMPANIES[d.co].name : d.co;
    return <div style={{...ttStyle,padding:"8px 12px"}}>
      <p style={{margin:"0 0 2px",fontWeight:500}}>{d.co} — {coName}</p>
      {payload.map((p,i)=><p key={i} style={{margin:0}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</p>)}
    </div>;
  };

  const Card = ({title,sub,children,col2})=>(
    <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"14px 16px",gridColumn:col2?"span 2":undefined}}>
      <p style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",margin:sub?"0 0 2px":"0 0 12px"}}>{title}</p>
      {sub&&<p style={{fontSize:11,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>{sub}</p>}
      {children}
    </div>
  );

  const Bars = ({metric,height=190,unit="%",noRef})=>{
    const data=barData(metric); const ref=noRef?null:IND[metric];
    return <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{top:18,right:60,left:-10,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false}/>
        <XAxis dataKey="name" tick={ax} axisLine={false} tickLine={false}/>
        <YAxis tick={ax} axisLine={false} tickLine={false} unit={unit}/>
        <Tooltip content={<Tip/>}/>
        {ref!=null&&<ReferenceLine y={ref} stroke="#B4B2A9" strokeDasharray="4 4" label={{value:`Avg ${ref.toFixed(1)}${unit}`,position:"right",fontSize:9,fill:"#888"}}/>}
        <Bar dataKey="value" name={metric} radius={[3,3,0,0]} maxBarSize={44}
          label={{position:"top",fontSize:9,fill:"var(--color-text-secondary)",formatter:v=>v!=null?v.toFixed(1)+unit:""}}>
          {data.map(d=><Cell key={d.co} fill={fill(d.co)}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>;
  };

  const Btn = ({id,label,active,onClick})=>{
    const isActive = active!=null ? active : tab===id;
    return (
      <button onClick={onClick||(()=>setTab(id))} style={{padding:"6px 14px",borderRadius:20,border:"0.5px solid",cursor:"pointer",fontSize:12,fontWeight:500,
        background:isActive?ORANGE:"var(--color-background-primary)",
        borderColor:isActive?ORANGE:"var(--color-border-tertiary)",
        color:isActive?"#fff":"var(--color-text-secondary)"}}>
        {label}
      </button>
    );
  };

  const filtered = ALL_COS.filter(co=>!search||COMPANIES[co].name.toLowerCase().includes(search.toLowerCase())||co.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{fontFamily:"var(--font-sans)",background:"var(--color-background-tertiary)",minHeight:"100vh"}}>

      {/* Header */}
      <div style={{background:ORANGE,padding:"12px 24px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{background:"#fff",borderRadius:4,padding:"3px 8px",fontWeight:700,fontSize:12,color:ORANGE,letterSpacing:1}}>PwC</div>
        <span style={{color:"#fff",fontWeight:500,fontSize:14}}>Thailand insurance benchmarking</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:12}}>TFRS 17</span>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>Full year 2025</span>
          <span style={{background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:12}}>{ALL_COS.length} companies · separate statements · FY2025</span>
        </div>
      </div>

      <div style={{padding:"16px 20px",maxWidth:980,margin:"0 auto"}}>

        {/* Selector */}
        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"14px 18px",marginBottom:12}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start"}}>
            <div>
              <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"0 0 7px",fontWeight:500,letterSpacing:1}}>YOUR COMPANY</p>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{fontSize:12,padding:"5px 10px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",width:150,display:"block",marginBottom:8}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,maxWidth:380}}>
                {filtered.map(co=>(
                  <button key={co} onClick={()=>changeFocus(co)} style={{padding:"4px 9px",borderRadius:6,border:"0.5px solid",cursor:"pointer",fontSize:11,fontWeight:500,
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
                  <button key={co} onClick={()=>togglePeer(co)} style={{padding:"4px 9px",borderRadius:6,border:"0.5px solid",cursor:"pointer",fontSize:11,fontWeight:500,
                    background:peers.includes(co)?ORANGE_LIGHT:"var(--color-background-primary)",
                    borderColor:peers.includes(co)?ORANGE_MID:"var(--color-border-secondary)",
                    color:peers.includes(co)?"#993C1D":"var(--color-text-tertiary)"}}>
                    {co}
                  </button>
                ))}
              </div>
              <p style={{fontSize:10,color:"var(--color-text-tertiary)",margin:"9px 0 0"}}>Not available: {NO_DATA.join(", ")} · KPI: PDF OCR garbled — re-upload text-selectable PDF · BHI in raw THB</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          <Btn id="overview" label="Overview"/>
          <Btn id="margin"   label="Margins"/>
          <Btn id="scale"    label="Scale"/>
          <Btn id="combined" label="Combined ratio"/>
          <Btn id="scatter"  label="Performance map"/>
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {[
                {label:"Insurance revenue",    val:fmtM(fc.revenue),    good:true,   diff:fc.revenue?((fc.revenue-IND.revenue)/Math.abs(IND.revenue)*100).toFixed(0)+"% vs avg":null},
                {label:"Service result (ISR)", val:fmtM(fc.isr),        good:fc.isr>0, diff:fc.isr!=null?fmtM(fc.isr-IND.isr)+" vs avg":null},
                {label:"Net profit",           val:fmtM(fc.netProfit),  good:fc.netProfit>0, diff:fc.netProfit!=null?fmtM(fc.netProfit-IND.netProfit)+" vs avg":null},
                {label:"Combined ratio",       val:fc.combined!=null?fc.combined.toFixed(1)+"%":"—", good:fc.combined<IND.combined, diff:fc.combined!=null?(fc.combined-IND.combined).toFixed(1)+"pp vs avg":null},
              ].map(({label,val,good,diff},i)=>(
                <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
                  <p style={{fontSize:11,color:"var(--color-text-secondary)",margin:"0 0 4px"}}>{label}</p>
                  <p style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 2px"}}>{val}</p>
                  {diff&&<p style={{fontSize:11,margin:0,color:good?"var(--color-text-success)":"var(--color-text-danger)"}}>{good?"↑":"↓"} {diff}</p>}
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Card title="Insurance service result (ISR)" sub="THB million · orange = your company · grey = peers">
                <Bars metric="isr" unit="M" height={200} noRef/>
              </Card>
              <Card title="Net profit / (loss)" sub="THB million">
                <Bars metric="netProfit" unit="M" height={200} noRef/>
              </Card>
            </div>
          </>
        )}

        {/* ── MARGINS ── */}
        {tab==="margin"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card title="ISR margin %" sub="Insurance service result / revenue" col2>
              <Bars metric="profitMargin" unit="%"/>
            </Card>
            <Card title="Net profit margin %" sub="Net profit / revenue">
              <Bars metric="netMargin" unit="%"/>
            </Card>
            <Card title="Top 10 by ISR margin">
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {ALL_COS.filter(co=>COMPANIES[co].profitMargin!=null).sort((a,b)=>COMPANIES[b].profitMargin-COMPANIES[a].profitMargin).slice(0,10).map((co,i)=>{
                  const d=COMPANIES[co]; const w=Math.max(0,Math.min(100,(d.profitMargin+35)/100*100));
                  return <div key={co}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                      <span style={{fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co} — {d.name}</span>
                      <span style={{color:d.profitMargin>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{d.profitMargin.toFixed(1)}%</span>
                    </div>
                    <div style={{height:5,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:w+"%",background:co===focus?ORANGE:d.profitMargin>=0?"#9FE1CB":PEER_FILL,borderRadius:3,transition:"width .3s"}}/>
                    </div>
                  </div>;
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── SCALE ── */}
        {tab==="scale"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card title="Insurance revenue (THB million)" col2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData("revenue").sort((a,b)=>b.value-a.value)} margin={{top:18,right:70,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false}/>
                  <XAxis dataKey="name" tick={ax} axisLine={false} tickLine={false}/>
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"B":v}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="value" name="Revenue" radius={[3,3,0,0]} maxBarSize={40}
                    label={{position:"top",fontSize:9,fill:"var(--color-text-secondary)",formatter:v=>v>=1000?(v/1000).toFixed(1)+"B":v.toFixed(0)+"M"}}>
                    {barData("revenue").sort((a,b)=>b.value-a.value).map(d=><Cell key={d.co} fill={fill(d.co)}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="All 20 companies ranked by revenue">
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ALL_COS.sort((a,b)=>COMPANIES[b].revenue-COMPANIES[a].revenue).map((co,i)=>{
                  const d=COMPANIES[co]; const maxRev=COMPANIES["DHP"].revenue; const pct=d.revenue/maxRev*100;
                  return <div key={co} style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:10,color:"var(--color-text-tertiary)",width:16,textAlign:"right"}}>{i+1}</span>
                    <span style={{fontSize:11,width:84,flexShrink:0,fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co}</span>
                    <div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:co===focus?ORANGE:PEER_FILL,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--color-text-secondary)",width:54,textAlign:"right"}}>{fmtM(d.revenue)}</span>
                  </div>;
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── COMBINED RATIO ── */}
        {tab==="combined"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card title="Combined ratio — selected companies %" sub="Lower is better · dashed line = industry average" col2>
              <Bars metric="combined" unit="%"/>
            </Card>
            <Card title="Profitable (combined ratio <100%)">
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {ALL_COS.filter(co=>COMPANIES[co].combined!=null&&COMPANIES[co].combined<100).sort((a,b)=>COMPANIES[a].combined-COMPANIES[b].combined).map((co)=>{
                  const d=COMPANIES[co]; const pct=d.combined/130*100;
                  return <div key={co} style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:11,width:84,flexShrink:0,fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co}</span>
                    <div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:co===focus?ORANGE:"#5DCAA5",borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,width:46,textAlign:"right",color:"var(--color-text-success)"}}>{d.combined.toFixed(1)}%</span>
                  </div>;
                })}
              </div>
            </Card>
            <Card title="Unprofitable (combined ratio ≥100%)">
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {ALL_COS.filter(co=>COMPANIES[co].combined!=null&&COMPANIES[co].combined>=100).sort((a,b)=>COMPANIES[b].combined-COMPANIES[a].combined).map((co)=>{
                  const d=COMPANIES[co]; const pct=Math.min(d.combined,135)/135*100;
                  return <div key={co} style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:11,width:84,flexShrink:0,fontWeight:co===focus?500:400,color:co===focus?ORANGE:"var(--color-text-primary)"}}>{co}</span>
                    <div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:co===focus?ORANGE:"#F09595",borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,width:46,textAlign:"right",color:"var(--color-text-danger)"}}>{d.combined.toFixed(1)}%</span>
                  </div>;
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── SCATTER MAP ── */}
        {tab==="scatter"&&(
          <Card title="Performance map" sub="ISR margin % (y) vs insurance revenue (x) — your company in orange">
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{top:10,right:20,left:0,bottom:24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)"/>
                <XAxis dataKey="x" name="Revenue" tick={ax} axisLine={false} tickLine={false}
                  label={{value:"Insurance revenue (THB M)",position:"insideBottom",offset:-14,fontSize:10,fill:"var(--color-text-tertiary)"}}
                  tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"B":v}/>
                <YAxis dataKey="y" name="ISR Margin" unit="%" tick={ax} axisLine={false} tickLine={false}
                  label={{value:"ISR margin %",angle:-90,position:"insideLeft",offset:10,fontSize:10,fill:"var(--color-text-tertiary)"}}/>
                <ReferenceLine y={0} stroke="#F09595" strokeDasharray="3 3"/>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload||!payload.length) return null;
                  const d=payload[0].payload;
                  return <div style={{...ttStyle,padding:"8px 12px"}}>
                    <p style={{margin:"0 0 2px",fontWeight:500}}>{d.co} — {COMPANIES[d.co].name}</p>
                    <p style={{margin:0}}>Revenue: {fmtM(d.x)}</p>
                    <p style={{margin:0}}>ISR margin: {d.y!=null?d.y.toFixed(1):"—"}%</p>
                    <p style={{margin:0}}>Net profit: {fmtM(COMPANIES[d.co].netProfit)}</p>
                  </div>;
                }}/>
                <Scatter
                  data={visible.filter(co=>COMPANIES[co].profitMargin!=null).map(co=>({
                    co, x:COMPANIES[co].revenue, y:COMPANIES[co].profitMargin
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
          </Card>
        )}

        <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Source: NotebookLM · NL_Insurance_FS_2025 · Separate financial statements (งบการเงินเฉพาะกิจการ) · FY2025</span>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>© 2026 PwC Thailand</span>
        </div>
      </div>
    </div>
  );
}
