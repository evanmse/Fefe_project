/* ============================================================
   HeroCircuit.tsx — circuit SVG (version simple, legacy).
   Supplanté par ScrollCircuit inline dans routes/index.tsx.
   Conservé pour référence uniquement.
   ============================================================ */

export function HeroCircuit({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      fill="none"
      aria-label="Circuit"
    >
      <path
        d="M60 220 C40 160 80 60 160 60 C240 60 220 130 280 130 C340 130 360 200 320 240 C280 280 200 250 160 250 C120 250 80 250 60 220 Z"
        stroke="#dc0000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 220 C40 160 80 60 160 60 C240 60 220 130 280 130 C340 130 360 200 320 240 C280 280 200 250 160 250 C120 250 80 250 60 220 Z"
        stroke="#00ff41"
        strokeWidth="3"
        strokeDasharray="6 18"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="60" cy="220" r="6" fill="#ffb800" />
      <text x="74" y="224" fontSize="11" fill="#8a8a8a" fontFamily="monospace">
        START / FINISH
      </text>
    </svg>
  )
}
