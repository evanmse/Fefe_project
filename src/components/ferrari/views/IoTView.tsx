import { IoTDashboard } from '../IoTDashboard'
import { G2DLidarView } from '../G2DLidarView'

/* ============================================================
   IoTView — Vue complète des dispositifs connectés + G2D Photosensible
   ============================================================ */

export function IoTView() {
  return (
    <div className="flex flex-col gap-8">
      <G2DLidarView />
      <IoTDashboard />
    </div>
  )
}
