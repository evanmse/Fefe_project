import { IoTDashboard } from '../IoTDashboard'
import { BuzzerControl } from '../BuzzerControl'
import { LedControl } from '../LedControl'
import { SectionHeader } from '../atoms'

/* ============================================================
   IoTView — Vue complète des dispositifs connectés
   ============================================================ */

export function IoTView() {
  return (
    <div className="flex flex-col gap-8">
      <IoTDashboard />
      <BuzzerControl />
      <LedControl />
    </div>
  )
}
