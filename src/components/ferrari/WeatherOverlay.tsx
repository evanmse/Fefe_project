import { useEffect, useState } from 'react'
import type { LiveTelemetry } from '~/components/ferrari/Dashboard'

/* ============================================================
   WeatherOverlay.tsx — Track conditions overlay
   Simulates realistic environmental data:
     - Track temperature: 28–45 °C
     - Wind speed:        0–25 km/h
     - Humidity:          40–80 %
   Uses setInterval to smoothly evolve values over time.
   ============================================================ */

interface WeatherData {
  trackTemp: number
  windSpeed: number
  humidity: number
}

const TRACK_TEMP_MIN = 28
const TRACK_TEMP_MAX = 45
const WIND_MIN = 0
const WIND_MAX = 25
const HUMIDITY_MIN = 40
const HUMIDITY_MAX = 80

interface WeatherOverlayProps {
  live: LiveTelemetry
}

/** Render a colored horizontal bar for a metric. */
function ConditionBar({
  label,
  value,
  unit,
  pct,
  lowColor,
  midColor,
  highColor,
}: {
  label: string
  value: number
  unit: string
  pct: number
  lowColor: string
  midColor: string
  highColor: string
}) {
  const barColor = pct < 33 ? lowColor : pct < 66 ? midColor : highColor

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span className="value-mono text-sm font-semibold text-white">
          {value.toFixed(1)}
          <span className="label-mono ml-1">{unit}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-[#1f1f1f]">
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

export default function WeatherOverlay({ live }: WeatherOverlayProps) {
  const [weather, setWeather] = useState<WeatherData>(() => ({
    trackTemp: 32 + Math.random() * 8,
    windSpeed: 5 + Math.random() * 12,
    humidity: 50 + Math.random() * 20,
  }))

  const [targets, setTargets] = useState<WeatherData>(() => ({
    trackTemp:
      TRACK_TEMP_MIN + Math.random() * (TRACK_TEMP_MAX - TRACK_TEMP_MIN),
    windSpeed: WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN),
    humidity: HUMIDITY_MIN + Math.random() * (HUMIDITY_MAX - HUMIDITY_MIN),
  }))

  // Simulate weather evolution every 2 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setWeather((prev) => {
        const tTarget = targets.trackTemp
        const wTarget = targets.windSpeed
        const hTarget = targets.humidity

        const newTemp =
          Math.abs(tTarget - prev.trackTemp) < 0.3
            ? prev.trackTemp
            : prev.trackTemp + Math.sign(tTarget - prev.trackTemp) * 0.3 +
              (Math.random() - 0.5) * 0.2

        const newWind =
          Math.abs(wTarget - prev.windSpeed) < 0.3
            ? prev.windSpeed
            : prev.windSpeed + Math.sign(wTarget - prev.windSpeed) * 0.3 +
              (Math.random() - 0.5) * 0.2

        const newHumidity =
          Math.abs(hTarget - prev.humidity) < 0.5
            ? prev.humidity
            : prev.humidity + Math.sign(hTarget - prev.humidity) * 0.5 +
              (Math.random() - 0.5) * 0.3

        return {
          trackTemp: Math.max(TRACK_TEMP_MIN, Math.min(TRACK_TEMP_MAX, newTemp)),
          windSpeed: Math.max(WIND_MIN, Math.min(WIND_MAX, newWind)),
          humidity: Math.max(HUMIDITY_MIN, Math.min(HUMIDITY_MAX, newHumidity)),
        }
      })

      setTargets(() => ({
        trackTemp:
          TRACK_TEMP_MIN + Math.random() * (TRACK_TEMP_MAX - TRACK_TEMP_MIN),
        windSpeed: WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN),
        humidity:
          HUMIDITY_MIN + Math.random() * (HUMIDITY_MAX - HUMIDITY_MIN),
      }))
    }, 2000)

    return () => clearInterval(id)
  }, [targets])

  const trackTempPct =
    ((weather.trackTemp - TRACK_TEMP_MIN) /
      (TRACK_TEMP_MAX - TRACK_TEMP_MIN)) *
    100
  const windPct =
    ((weather.windSpeed - WIND_MIN) / (WIND_MAX - WIND_MIN)) * 100
  const humidityPct =
    ((weather.humidity - HUMIDITY_MIN) / (HUMIDITY_MAX - HUMIDITY_MIN)) * 100

  const gripIndex = Math.max(
    0,
    Math.min(
      100,
      100 -
        (weather.trackTemp > 40 ? (weather.trackTemp - 40) * 4 : 0) -
        (weather.humidity > 70 ? (weather.humidity - 70) * 1.2 : 0),
    ),
  )

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#2e86ff]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2e86ff] animate-pulse-dot" />
          Conditions piste
        </span>
        <span className="label-mono text-[#8a8a8a]">
          {new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <ConditionBar
          label="Température piste"
          value={weather.trackTemp}
          unit="°C"
          pct={trackTempPct}
          lowColor="#00ff41"
          midColor="#ffb800"
          highColor="#dc0000"
        />
        <ConditionBar
          label="Vent"
          value={weather.windSpeed}
          unit="km/h"
          pct={windPct}
          lowColor="#00ff41"
          midColor="#2e86ff"
          highColor="#dc0000"
        />
        <ConditionBar
          label="Humidité"
          value={weather.humidity}
          unit="%"
          pct={humidityPct}
          lowColor="#00ff41"
          midColor="#ffb800"
          highColor="#2e86ff"
        />
      </div>

      {/* Grip index */}
      <div className="flex items-center justify-between rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-3">
        <span className="label-mono">Adhérence estimée</span>
        <span
          className="value-mono text-lg font-bold"
          style={{
            color:
              gripIndex > 70
                ? '#00ff41'
                : gripIndex > 40
                  ? '#ffb800'
                  : '#dc0000',
          }}
        >
          {gripIndex.toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-3 text-[10px] text-[#5a5a5a] label-mono">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#2e86ff]" /> Simulation
          météo
        </span>
        <span>Vitesse piste : {live.speed.toFixed(0)} km/h</span>
      </div>
    </div>
  )
}
