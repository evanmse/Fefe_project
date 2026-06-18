import { useEffect, useState, useRef, useCallback } from 'react'
import { StatusPill, SectionHeader } from './atoms'

interface LidarRow {
  id: number; distance_mm: number; luminosite: number; adc_raw?: number
  angle_deg: number; reflectivite: number | null; status: string; date_mesure: string
}

// Calibration points G2D
const CALIBRATION = { adc: [123, 854, 1007], lux: [6, 121, 2150] };

const API_BASE = ''

function demo(n: number): LidarRow[] {
  const now = Date.now()
  return Array.from({length:n},(_,i)=>{const t=i*0.1;const d=200+Math.sin(t*1.7)*80+Math.sin(t*0.3)*40+(Math.random()-0.5)*3;return{id:1000+i,distance_mm:Math.round(d*100)/100,luminosite:Math.max(0,Math.round(450+Math.sin(t*.8)*200+Math.cos(t*.5)*150+(Math.random()-.5)*60)),angle_deg:Math.round(Math.sin(t*.6)*15*100)/100,reflectivite:Math.round((60+Math.cos(t*.4)*20)*100)/100,status:d<120?'ERR':d<180?'WARN':'OK',date_mesure:new Date(now-(n-i)*2000).toISOString()}})
}

export function G2DLidarView() {
  const [data, setData] = useState<LidarRow[]>([])
  const [latest, setLatest] = useState<LidarRow|null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const fetchD = useCallback(async()=>{try{const r=await window.fetch(`${API_BASE}/api/db_sensors?action=lidar_g2d&limit=50`);const j=await r.json();if(j.success&&j.data?.length){setData(j.data);setLatest(j.data[0])}}catch{const d=demo(50);setData(d);setLatest(d[0])}finally{setLoading(false)}},[])
  useEffect(()=>{fetchD();const iv=setInterval(fetchD,3000);return()=>clearInterval(iv)},[fetchD])

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return
    let phase=0;let raf=0
    const draw=()=>{
      const w=c.width,h=c.height;ctx.fillStyle='rgba(5,5,5,0.3)';ctx.fillRect(0,0,w,h)
      const cx=w/2,cy=h*.7;phase+=.025
      for(let r=30;r<=200;r+=30){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(31,31,31,0.4)';ctx.stroke()}
      const ba=(phase*60)%360;const rad=(ba-90)*Math.PI/180
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(rad)*200,cy+Math.sin(rad)*200);ctx.strokeStyle='rgba(0,255,65,0.12)';ctx.stroke()
      const dist=latest?latest.distance_mm/2:150
      for(let d=20;d<Math.min(dist,190);d+=8+Math.random()*12){const px=cx+Math.cos(rad)*d,py=cy+Math.sin(rad)*d;ctx.fillStyle=`rgba(0,255,65,${(1-d/200)*.7})`;ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill()}
      if(dist<200){const mx=cx+Math.cos(rad)*Math.min(dist,190),my=cy+Math.sin(rad)*Math.min(dist,190);ctx.beginPath();ctx.arc(mx,my,6,0,Math.PI*2);ctx.fillStyle=latest?.status==='ERR'?'#dc0000':latest?.status==='WARN'?'#ffb800':'#00ff41';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()}
      raf=requestAnimationFrame(draw)
    };draw();return()=>cancelAnimationFrame(raf)
  },[latest])

  if(loading)return<div className="panel p-8 text-center"><div className="badge-live"><span className="h-2 w-2 rounded-full bg-[#00ff41] animate-pulse-dot"/>Scan LIDAR G2D…</div></div>

  const s=latest?.status==='OK'?'OPTIMAL' as const:latest?.status==='WARN'?'SUBOPTIMAL' as const:'CRITICAL' as const
  const lumPct=latest?Math.min(100,(latest.luminosite/1000)*100):50
  const distM=latest?latest.distance_mm/1000:0

  return(
    <div className="flex flex-col gap-6">
      <SectionHeader index="G2D LIDAR" title="Détection LIDAR · Groupe G2D" subtitle="Capteur LIDAR temps réel — Distance, luminosité, réflectivité, angle de faisceau. 50 mesures en base."/>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel panel-grid relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] px-5 py-3">
            <span className="badge-live text-[#00ff41]"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot"/>Scan LIDAR · Temps réel</span>
            <StatusPill status={s}/>
          </div>
          <canvas ref={canvasRef} width={520} height={320} className="w-full bg-[#050505]"/>
          <div className="border-t border-[#1f1f1f] px-5 py-2 flex justify-between label-mono text-[10px]">
            <span>Angle: {latest?.angle_deg?.toFixed(1)}°</span>
            <span>Réfl: {latest?.reflectivite?.toFixed(1)}%</span>
            <span className="text-[#00ff41]">100 Hz</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="panel p-5 flex flex-col gap-3">
            <span className="label-mono">📏 Distance mesurée</span>
            <div className="flex items-baseline gap-2"><span className="value-mono text-5xl font-bold" style={{color:latest?.status==='ERR'?'#dc0000':'#00ff41'}}>{latest?.distance_mm?.toFixed(1)??'—'}</span><span className="label-mono text-lg">mm</span></div>
            <div className="text-sm text-[#8a8a8a]">≈ {distM.toFixed(3)} m</div>
            <div className="h-2 w-full bg-[#1f1f1f] rounded-sm overflow-hidden"><div className="h-full transition-all" style={{width:`${Math.min(100,((latest?.distance_mm??0)/500)*100)}%`,backgroundColor:(latest?.distance_mm??0)<120?'#dc0000':(latest?.distance_mm??0)<180?'#ffb800':'#00ff41'}}/></div>
          </div>
          <div className="panel p-5 flex flex-col gap-3">
            <span className="label-mono">💡 Luminosité</span>
            <div className="flex items-baseline gap-2"><span className="value-mono text-5xl font-bold text-[#ffb800]">{latest?.luminosite??'—'}</span><span className="label-mono text-lg">lux</span></div>
            <div className="h-2 w-full bg-[#1f1f1f] rounded-sm overflow-hidden"><div className="h-full bg-[#ffb800] transition-all" style={{width:`${lumPct}%`}}/></div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5 flex flex-col gap-3">
          <span className="badge-live text-[#00ff41]"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot"/>Distance · 50 mesures</span>
          <svg viewBox="0 0 500 120" className="w-full">
            <line x1="40" y1="100" x2="480" y2="100" stroke="#1f1f1f"/>
            {data.length>1&&<polyline fill="none" stroke="#00ff41" strokeWidth="1.5" points={[...data].reverse().map((d,i)=>{const x=40+(i/Math.max(1,data.length-1))*440;return`${x},${100-Math.min(1,(d.distance_mm||0)/500)*90}`}).join(' ')}/>}
          </svg>
        </div>
        <div className="panel p-5 flex flex-col gap-3">
          <span className="badge-live text-[#ffb800]"><span className="h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot"/>Luminosité · 50 mesures</span>
          <svg viewBox="0 0 500 120" className="w-full">
            <line x1="40" y1="100" x2="480" y2="100" stroke="#1f1f1f"/>
            {data.length>1&&<polyline fill="none" stroke="#ffb800" strokeWidth="1.5" points={[...data].reverse().map((d,i)=>{const x=40+(i/Math.max(1,data.length-1))*440;return`${x},${100-Math.min(1,(d.luminosite||0)/1000)*90}`}).join(' ')}/>}
          </svg>
        </div>
      </div>
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
          <span className="badge-live"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot"/>Flux G2D_LIDAR</span>
          <span className="label-mono">{data.length} mesures</span>
        </div>
        <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-px bg-[#1f1f1f] text-[11px]">
          {['ID','DIST (mm)','LUX','ANGLE','REFL.','STATUS'].map(h=><div key={h} className="bg-[#121212] px-3 py-2 label-mono">{h}</div>)}
          {data.slice(0,10).map((d,i)=>(<div key={d.id} className="contents" style={{opacity:1-i*.08}}>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono text-[#8a8a8a]">{d.id}</div>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono" style={{color:d.status==='ERR'?'#dc0000':d.status==='WARN'?'#ffb800':'#00ff41'}}>{Number(d.distance_mm).toFixed(1)}</div>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono text-[#ffb800]">{d.luminosite}</div>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono">{Number(d.angle_deg).toFixed(2)}°</div>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono">{d.reflectivite?Number(d.reflectivite).toFixed(1)+'%':'—'}</div>
            <div className="bg-[#0d0d0d] px-3 py-1.5 value-mono"><span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${d.status==='ERR'?'bg-[#dc0000]':d.status==='WARN'?'bg-[#ffb800]':'bg-[#00ff41]'}`}/>{d.status}</div>
          </div>))}
        </div>
      </div>
    </div>
  )
}
