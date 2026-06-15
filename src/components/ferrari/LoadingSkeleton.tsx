import type { ReactNode } from 'react'

/* ============================================================
   LoadingSkeleton.tsx — Loading skeleton components
   PanelSkeleton:     a single panel placeholder with animated bars
   DashboardSkeleton: full-page skeleton matching the dashboard grid
   ============================================================ */

function SkeletonBar({
  width,
  height = 'h-3',
}: {
  width: string
  height?: string
}) {
  return (
    <div
      className={`${height} ${width} animate-pulse rounded-sm bg-[#1f1f1f]`}
    />
  )
}

interface PanelSkeletonProps {
  lines?: number
  children?: ReactNode
}

export function PanelSkeleton({ lines = 5, children }: PanelSkeletonProps) {
  return (
    <div className="panel p-5 flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-32" />
        <SkeletonBar width="w-16" />
      </div>
      {/* Content bars */}
      {children ?? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBar
              key={i}
              width={`${[80, 65, 90, 50, 75][i] || 70}%`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Title skeleton */}
      <div className="flex items-center gap-4">
        <SkeletonBar width="w-12" height="h-12" />
        <div className="flex flex-col gap-2">
          <SkeletonBar width="w-56" height="h-5" />
          <SkeletonBar width="w-32" height="h-3" />
        </div>
      </div>

      {/* KPI row skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <PanelSkeleton key={`kpi-${i}`} lines={2} />
        ))}
      </div>

      {/* Main grid skeleton — 2 columns */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <PanelSkeleton lines={6} />
          <PanelSkeleton lines={4} />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-5">
          <PanelSkeleton lines={8} />
          <PanelSkeleton lines={5} />
        </div>
      </div>

      {/* Bottom full-width skeleton */}
      <PanelSkeleton lines={3} />

      {/* Footer skeleton */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <SkeletonBar width="w-24" height="h-3" />
        <SkeletonBar width="w-12" height="h-3" />
        <SkeletonBar width="w-20" height="h-3" />
      </div>
    </div>
  )
}
