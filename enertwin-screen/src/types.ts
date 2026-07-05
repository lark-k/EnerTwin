export type SceneMode =
  | 'overview'
  | 'pv'
  | 'storage'
  | 'charging'
  | 'building'
  | 'alarm'

export interface RealtimeMetrics {
  pvCapacityMw: number
  pvPowerKw: number
  pvEnergyTodayKwh: number
  pvEnergyMonthKwh: number
  loadPowerKw: number
  loadEnergyTodayKwh: number
  loadEnergyMonthKwh: number
  storageSoc: number
  storageSoh: number
  storageChargePowerKw: number
  storageDischargePowerKw: number
  chargerPileCount: number
  chargerConnectorCount: number
  chargerOccupiedCount: number
  chargerIdleCount: number
  chargerFaultCount: number
  chargerPowerKw: number
  chargerEnergyTodayKwh: number
  gridImportPowerKw: number
  gridExportPowerKw: number
  selfConsumptionRate: number
  carbonReductionKg: number
  costSavingYuan: number
  alarmCount: number
  deviceOnlineRate: number
}

export interface TrendPoint {
  time: string
  pv: number
  load: number
  storage: number
  charging: number
  price: number
}

export interface BuildingRank {
  name: string
  loadKw: number
  ratio: number
}

export interface AlarmEvent {
  id: string
  level: 'critical' | 'major' | 'minor'
  device: string
  message: string
  time: string
}

export interface EnergyFlow {
  from: string
  to: string
  powerKw: number
  type: 'pv' | 'storage' | 'charging' | 'grid' | 'load'
}
