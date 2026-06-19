import { IoTDashboard } from '../IoTDashboard'
import { BuzzerControl } from '../BuzzerControl'
import { LedControl } from '../LedControl'
import { G2DLidarView } from '../G2DLidarView'
import { SectionHeader } from '../atoms'

/* ============================================================
   IoTView — Vue complète des dispositifs connectés + G2D PHOTOSENSIBLE
   ============================================================ */

export function IoTView() {
  return (
    <div className="flex flex-col gap-8">
      <G2DLidarView />
      <IoTDashboard />
      <BuzzerControl />
      <LedControl />
    </div>
  )
}
