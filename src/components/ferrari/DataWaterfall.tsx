import { useEffect, useRef, useState, useCallback } from 'react'

interface LidarRow { id: number; distance_mm: number; luminosite: number; adc_raw?: number; reflectivite: number|null; status: string; date_mesure: string }

const CH = [{k:'LUX',c:'#ffb800'},{k:'DIST',c:'#00ff41'},{k:'ADC',c:'#3b82f6'},{k:'REFL',c:'#f5f5f5'},{k:'PISTE',c:'#dc0000'}]

export function DataWaterfall({ rows = 14 }: { rows?: number }) {
  const [data, setData] = useState<LidarRow[]>([])
  const [connected, setConnected] = useState<boolean|null>(null)
  const iv = useRef<ReturnType<typeof setInterval>|undefined>(undefined)

  const fetch = useCallback(async()=>{
    try{const r=await window.fetch(`/api/db_api.php?action=lidar_g2d&limit=${rows}`);const j=await r.json();if(j.success&&j.data?.length){setData(j.data);setConnected(true);return}}catch{}
    setConnected(false)
  },[rows])

  useEffect(()=>{fetch();iv.current=setInterval(fetch,1000);return()=>{if(iv.current)clearInterval(iv.current)}},[fetch])

  const offTrack=(r:LidarRow)=>{const rf=r.reflectivite?Number(r.reflectivite):0;return rf>80}

  if(connected===false)return<div className="panel p-6 text-center"><div className="badge-live text-[#ffb800]"><span className="h-2 w-2 rounded-full bg-[#ffb800] animate-pulse-dot"/>Capteur Photosensible G2D non détecté</div><p className="label-mono mt-2">Branchez l&apos;Arduino et lancez <code className="text-[#00ff41]">python3 scripts/lidar_ingest.py</code></p></div>
  if(!data.length)return<div className="panel p-6 text-center"><div className="badge-live"><span className="h-2 w-2 rounded-full bg-[#00ff41] animate-pulse-dot"/>Initialisation flux CAN…</div></div>

  const otc=data.filter(offTrack).length

  return(
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
        <span className="badge-live"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot"/>Flux CAN · Photosensible G2D</span>
        <div className="flex items-center gap-4">
          {otc>0&&<span className="label-mono text-[#dc0000]">⚠️ HORS-PISTE ×{otc}</span>}
          <span className="label-mono">{data.length} trames</span>
        </div>
      </div>
      <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-px bg-[#1f1f1f] text-[11px]">
        <div className="bg-[#121212] px-3 py-2 label-mono">TIME</div>
        {CH.map(c=><div key={c.k} className="bg-[#121212] px-3 py-2 label-mono" style={{color:c.c}}>{c.k}</div>)}
        {data.map((r,i)=>{const ot=offTrack(r);const t=r.date_mesure?new Date(r.date_mesure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'--:--:--';const rf=r.reflectivite?Number(r.reflectivite):0;const bg=ot?'bg-[#1a0000]':'bg-[#0d0d0d]';const op=1-(i/data.length)*.7
          return(<div key={r.id} className="contents">
            <div className={`${bg} px-3 py-1.5 value-mono text-[#8a8a8a]`} style={{opacity:op}}>{t}</div>
            <div className={`${bg} px-3 py-1.5 value-mono text-[#ffb800]`} style={{opacity:op}}>{Number(r.luminosite).toFixed(0)}</div>
            <div className={`${bg} px-3 py-1.5 value-mono text-[#00ff41]`} style={{opacity:op}}>{Number(r.distance_mm).toFixed(1)}</div>
            <div className={`${bg} px-3 py-1.5 value-mono text-[#3b82f6]`} style={{opacity:op}}>{r.adc_raw??'—'}</div>
            <div className={`${bg} px-3 py-1.5 value-mono`} style={{opacity:op,color:rf>80?'#dc0000':rf>60?'#ffb800':'#f5f5f5',fontWeight:rf>80?'bold':'normal'}}>{rf.toFixed(1)}</div>
            <div className={`${bg} px-3 py-1.5 value-mono font-bold`} style={{opacity:op,color:ot?'#dc0000':'#00ff41'}}>{ot?'HORS':'OK'}</div>
          </div>)})}
      </div>
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1f1f1f] label-mono text-[10px]">
        <span>🟢 Sur piste</span><span className="text-[#dc0000]">🔴 Hors-piste (refl &gt; 80%)</span>
        <span className="ml-auto">ADC 123→6lx · 854→121lx · 1007→2150lx</span>
      </div>
    </div>
  )
}
