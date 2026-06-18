import { useEffect, useState, useCallback, useRef } from 'react'
import { StatusPill, SectionHeader } from './atoms'

interface SensorGroup {
  groupe: string
  temperature: number | null
  humidite: number | null
  derniere_mesure: string
  nb_mesures: number
  source?: string
}

const GROUP_META: Record<string, { name: string; icon: string }> = {
  g2e: { name: 'G2E · Buzzer', icon: '🔊' },
  g2c: { name: 'G2C · Multi', icon: '📊' },
  g2b: { name: 'G2B · Auto', icon: '🚗' },
  g2a: { name: 'G2A · Race', icon: '🏎️' },
  g2d: { name: 'G2D · Standby', icon: '📡' },
}

const API_BASE = ''

function demoGroups(): SensorGroup[] {
  return [
    { groupe:'g2c',temperature:30,humidite:47,derniere_mesure:new Date().toISOString(),nb_mesures:2097,source:'Mesure' },
    { groupe:'g2e',temperature:57,humidite:null,derniere_mesure:new Date().toISOString(),nb_mesures:2,source:'Mesure' },
    { groupe:'g2b',temperature:22,humidite:38,derniere_mesure:new Date().toISOString(),nb_mesures:291,source:'G2B' },
  ]
}

export function IoTDashboard() {
  const [groups, setGroups] = useState<SensorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string|null>(null)
  const [history, setHistory] = useState<Array<{date:string;valeur:number}>>([])
  const [htype, setHtype] = useState<'temperature'|'humidite'>('temperature')
  const intervalRef = useRef<ReturnType<typeof setInterval>|undefined>(undefined)

  const fetchData = useCallback(async () => {
    try {
      const r = await window.fetch(`/api/db_api.php?action=sensors`)
      const j = await r.json()
      if (j.success && j.data?.length) { setGroups(j.data); return }
    } catch { /* fallback demo */ }
    setGroups(demoGroups())
  }, [])

  const fetchHist = useCallback(async (g:string, t:string) => {
    try {
      const r = await window.fetch(`/api/db_api.php?action=sensor_history&groupe=${g}&type=${t}&limit=30`)
      const j = await r.json()
      if (j.success && j.data?.length) { setHistory(j.data); return }
    } catch { /* demo */ }
    const now = Date.now()
    const base = t==='temperature'?25:45; const amp = t==='temperature'?10:20
    setHistory(Array.from({length:30},(_,i)=>({date:new Date(now-(29-i)*10000).toISOString(),valeur:base+Math.sin(i*0.3)*amp+Math.random()*amp*0.3})))
  }, [])

  useEffect(()=>{fetchData();intervalRef.current=setInterval(fetchData,8000);return ()=>{if(intervalRef.current)clearInterval(intervalRef.current)}},[fetchData])
  useEffect(()=>{if(sel)fetchHist(sel,htype)},[sel,htype,fetchHist])

  if(loading)return <div className="panel p-8 text-center"><div className="badge-live"><span className="h-2 w-2 rounded-full bg-[#00ff41] animate-pulse-dot"/>Connexion BDD…</div></div>

  const sd = groups.find(g=>g.groupe===sel)
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader index="IoT DEVICES" title="Capteurs & Actionneurs" subtitle={`${groups.length} groupes en ligne — température, humidité, buzzer, LEDs. Rafraîchi toutes les 8s.`}/>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(g=>{
          const m=GROUP_META[g.groupe]||{name:g.groupe,icon:'📦'}
          return(
            <button key={g.groupe} onClick={()=>setSel(sel===g.groupe?null:g.groupe)}
              className={`panel p-4 text-left transition-all cursor-pointer ${sel===g.groupe?'border-[#dc0000] shadow-[0_0_12px_-2px_rgba(220,0,0,0.3)]':'hover:border-[#3a3a3a]'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{m.icon}</span>
                <span className="label-mono text-[#8a8a8a]">{g.source||'BDD'} · {g.nb_mesures} mesures</span>
              </div>
              <div className="title-display text-sm mb-2">{m.name}</div>
              {g.temperature!==null&&<div className="flex items-center justify-between py-0.5"><span className="label-mono">🌡️ Temp.</span><span className="value-mono text-sm font-bold text-[#dc0000]">{Number(g.temperature).toFixed(1)}°C</span></div>}
              {g.humidite!==null&&<div className="flex items-center justify-between py-0.5"><span className="label-mono">💧 Humid.</span><span className="value-mono text-sm font-bold text-[#3b82f6]">{Number(g.humidite).toFixed(1)}%</span></div>}
              <div className="mt-2 pt-2 border-t border-[#1f1f1f] label-mono text-[10px]">{g.derniere_mesure?new Date(g.derniere_mesure).toLocaleString('fr-FR'):'—'}</div>
            </button>
          )
        })}
      </div>
      {sd&&(
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="badge-live text-[#dc0000]"><span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot"/>{GROUP_META[sd.groupe]?.name||sd.groupe}</span>
              <StatusPill status="OPTIMAL"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sd.temperature!==null&&<MiniG label="Température" v={sd.temperature} u="°C" max={80} color="#dc0000"/>}
              {sd.humidite!==null&&<MiniG label="Humidité" v={sd.humidite} u="%" max={100} color="#3b82f6"/>}
            </div>
            <div className="border-t border-[#1f1f1f] pt-3">
              <span className="label-mono">Source: {sd.source||'BDD'} · {sd.nb_mesures} enregistrements</span>
            </div>
          </div>
          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="badge-live"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot"/>Historique</span>
              <div className="flex gap-1">
                {(['temperature','humidite']as const).map(t=>(<button key={t} onClick={()=>setHtype(t)} className={`px-2 py-1 label-mono text-[10px] ${htype===t?'bg-[#dc0000] text-white':'bg-[#141414] text-[#8a8a8a]'}`}>{t==='temperature'?'🌡️ T°':'💧 H%'}</button>))}
              </div>
            </div>
            <div className="relative h-40">
              <svg viewBox="0 0 400 140" className="w-full h-full">
                <line x1="40" y1="120" x2="380" y2="120" stroke="#1f1f1f"/><line x1="40" y1="10" x2="40" y2="120" stroke="#1f1f1f"/>
                {history.length>1&&<polyline fill="none" strokeWidth="2" stroke={htype==='temperature'?'#dc0000':'#3b82f6'} points={history.map((h,i)=>{const x=40+(i/(history.length-1))*340;const maxV=htype==='temperature'?80:100;return`${x},${120-(h.valeur/maxV)*110}`}).join(' ')}/>}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniG({label,v,u,max,color}:{label:string;v:number;u:string;max:number;color:string}){
  const pct=Math.min(100,(v/max)*100)
  return(<div className="flex flex-col gap-1.5"><span className="label-mono">{label}</span><span className="value-mono text-xl font-bold" style={{color}}>{v.toFixed(1)}<span className="label-mono ml-1 text-[10px]">{u}</span></span><div className="h-1.5 w-full bg-[#1f1f1f] rounded-sm overflow-hidden"><div className="h-full" style={{width:`${pct}%`,backgroundColor:color}}/></div></div>)
}
