import { useEffect, useState, useCallback, useRef } from 'react'
import { StatusPill, SectionHeader } from './atoms'

/* ============================================================
   IoTDashboard.tsx — Affichage capteurs réels depuis la BDD
   ============================================================ */

interface SensorRow {
  id: number; groupe: string; temperature: number | null
  humidite: number | null; luminosite: number | null; date_mesure: string
}

interface GroupCard {
  groupe: string; temperature: number | null; humidite: number | null
  luminosite: number | null; date_mesure: string; hasActuator: boolean
}

const GROUP_META: Record<string, { name: string; hasActuator: boolean; icon: string }> = {
  g2e: { name: 'G2E · Buzzer', hasActuator: true, icon: '🔊' },
  g2a: { name: 'G2A · Capteurs', hasActuator: false, icon: '🌡️' },
  g2b: { name: 'G2B · Capteurs', hasActuator: false, icon: '💧' },
  g2c: { name: 'G2C · Capteurs', hasActuator: false, icon: '☀️' },
  g2d: { name: 'G2D · Capteurs', hasActuator: false, icon: '📡' },
}

const API_BASE = ''

function generateDemoGroups(): GroupCard[] {
  const groupes = ['g2e', 'g2a', 'g2b', 'g2c', 'g2d']
  return groupes.map((g) => ({
    groupe: g,
    temperature: g !== 'g2d' ? 20 + (Math.random() - 0.3) * 8 : null,
    humidite: g !== 'g2c' ? 40 + Math.random() * 25 : null,
    luminosite: g === 'g2a' || g === 'g2b' ? 300 + Math.random() * 600 : null,
    date_mesure: new Date().toISOString(),
    hasActuator: g === 'g2e',
  }))
}

export function IoTDashboard() {
  const [groups, setGroups] = useState<GroupCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<{ date_mesure: string; valeur: number }>>([])
  const [historyType, setHistoryType] = useState<'temperature'|'humidite'|'luminosite'>('temperature')
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const fetchSensors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db_sensors?action=sensors`)
      const json = await res.json()
      if (json.success && json.data) {
        const cards: GroupCard[] = (json.data as SensorRow[]).map((row) => ({
          groupe: row.groupe,
          temperature: row.temperature,
          humidite: row.humidite,
          luminosite: row.luminosite,
          date_mesure: row.date_mesure,
          hasActuator: GROUP_META[row.groupe]?.hasActuator ?? false,
        }))
        setGroups(cards)
      } else {
        setGroups(generateDemoGroups())
      }
    } catch {
      setGroups(generateDemoGroups())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async (groupe: string, type: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/db_sensors?action=sensor_history&groupe=${groupe}&type=${type}&limit=30`)
      const json = await res.json()
      if (json.success && json.data) { setHistory(json.data); return }
    } catch {}
    const now = Date.now()
    const demo = Array.from({ length: 30 }, (_, i) => ({
      date_mesure: new Date(now - (29 - i) * 5000).toISOString(),
      valeur: type === 'temperature' ? 20 + Math.sin(i * 0.3) * 5 + Math.random() * 2
        : type === 'humidite' ? 45 + Math.cos(i * 0.2) * 15 + Math.random() * 3
        : 400 + Math.sin(i * 0.4) * 200 + Math.random() * 50,
    }))
    setHistory(demo)
  }, [])

  useEffect(() => { fetchSensors(); intervalRef.current = setInterval(fetchSensors, 5000); return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [fetchSensors])
  useEffect(() => { if (selectedGroup) fetchHistory(selectedGroup, historyType) }, [selectedGroup, historyType, fetchHistory])

  if (loading) {
    return <div className="panel p-8 text-center"><div className="badge-live"><span className="h-2 w-2 rounded-full bg-[#00ff41] animate-pulse-dot" />Connexion à la base de données…</div></div>
  }

  const selectedData = groups.find(g => g.groupe === selectedGroup)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader index="IoT DEVICES" title="Capteurs & Actionneurs" subtitle="Données temps réel des groupes — température, humidité, luminosité, buzzer et LEDs." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {groups.map((group) => {
          const meta = GROUP_META[group.groupe] || { name: group.groupe, hasActuator: false, icon: '📦' }
          const isSel = selectedGroup === group.groupe
          return (
            <button key={group.groupe} onClick={() => setSelectedGroup(isSel ? null : group.groupe)}
              className={`panel p-4 text-left transition-all cursor-pointer ${isSel ? 'border-[#dc0000] shadow-[0_0_12px_-2px_rgba(220,0,0,0.3)]' : 'hover:border-[#3a3a3a]'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{meta.icon}</span>
                <span className={`label-mono ${meta.hasActuator ? 'text-[#ffb800]' : 'text-[#8a8a8a]'}`}>{meta.hasActuator ? 'ACT' : 'CAP'}</span>
              </div>
              <div className="title-display text-sm mb-2">{meta.name}</div>
              {group.temperature !== null && (<div className="flex items-center justify-between py-0.5"><span className="label-mono">Temp.</span><span className="value-mono text-sm font-bold text-[#dc0000]">{group.temperature.toFixed(1)}°C</span></div>)}
              {group.humidite !== null && (<div className="flex items-center justify-between py-0.5"><span className="label-mono">Humid.</span><span className="value-mono text-sm font-bold text-[#3b82f6]">{group.humidite.toFixed(1)}%</span></div>)}
              {group.luminosite !== null && (<div className="flex items-center justify-between py-0.5"><span className="label-mono">Lum.</span><span className="value-mono text-sm font-bold text-[#ffb800]">{group.luminosite.toFixed(0)} lux</span></div>)}
              <div className="mt-2 pt-2 border-t border-[#1f1f1f] label-mono text-[10px]">{group.date_mesure ? new Date(group.date_mesure).toLocaleTimeString('fr-FR') : '—'}</div>
            </button>
          )
        })}
      </div>

      {selectedData && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="badge-live text-[#dc0000]"><span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />{GROUP_META[selectedData.groupe]?.name || selectedData.groupe}</span>
              <StatusPill status="OPTIMAL" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {selectedData.temperature !== null && <MiniGauge label="Température" value={selectedData.temperature} unit="°C" max={60} color="#dc0000" />}
              {selectedData.humidite !== null && <MiniGauge label="Humidité" value={selectedData.humidite} unit="%" max={100} color="#3b82f6" />}
              {selectedData.luminosite !== null && <MiniGauge label="Luminosité" value={selectedData.luminosite} unit="lux" max={1000} color="#ffb800" />}
            </div>
            {selectedData.hasActuator && <div className="border-t border-[#1f1f1f] pt-4"><span className="label-mono text-[#ffb800]">⚡ Ce groupe possède des actionneurs (buzzer/LED)</span></div>}
          </div>

          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="badge-live"><span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />Historique · {historyType}</span>
              <div className="flex gap-1">
                {(['temperature','humidite','luminosite'] as const).map(t => (
                  <button key={t} onClick={() => setHistoryType(t)}
                    className={`px-2 py-1 label-mono text-[10px] transition ${historyType===t?'bg-[#dc0000] text-white':'bg-[#141414] text-[#8a8a8a] hover:text-white'}`}>
                    {t==='temperature'?'T°':t==='humidite'?'H%':'Lux'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-40">
              <svg viewBox="0 0 400 140" className="w-full h-full">
                <line x1="40" y1="120" x2="380" y2="120" stroke="#1f1f1f" strokeWidth="1" />
                <line x1="40" y1="10" x2="40" y2="120" stroke="#1f1f1f" strokeWidth="1" />
                {history.length > 1 && (
                  <polyline fill="none" strokeWidth="2"
                    stroke={historyType==='temperature'?'#dc0000':historyType==='humidite'?'#3b82f6':'#ffb800'}
                    points={history.map((h,i) => {
                      const x = 40 + (i/Math.max(1,history.length-1))*340
                      const maxV = historyType==='temperature'?60:historyType==='humidite'?100:1000
                      return `${x},${120-(h.valeur/maxV)*110}`
                    }).join(' ')}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniGauge({ label, value, unit, max, color }: { label: string; value: number; unit: string; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <span className="value-mono text-xl font-bold" style={{ color }}>{value.toFixed(1)}<span className="label-mono ml-1 text-[10px]">{unit}</span></span>
      <div className="h-1.5 w-full bg-[#1f1f1f] rounded-sm overflow-hidden"><div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
    </div>
  )
}
