import type { AlarmEvent, BuildingRank, EnergyFlow, RealtimeMetrics, TrendPoint } from '../types'

export const initialMetrics: RealtimeMetrics = {
  pvCapacityMw: 2.8,
  pvPowerKw: 186.5,
  pvEnergyTodayKwh: 1248.8,
  pvEnergyMonthKwh: 42680,
  loadPowerKw: 432.8,
  loadEnergyTodayKwh: 6842.4,
  loadEnergyMonthKwh: 186420,
  storageSoc: 76.2,
  storageSoh: 95.1,
  storageChargePowerKw: 0,
  storageDischargePowerKw: 80,
  chargerPileCount: 36,
  chargerConnectorCount: 72,
  chargerOccupiedCount: 18,
  chargerIdleCount: 51,
  chargerFaultCount: 3,
  chargerPowerKw: 95.6,
  chargerEnergyTodayKwh: 1380.3,
  gridImportPowerKw: 150.7,
  gridExportPowerKw: 0,
  selfConsumptionRate: 87.3,
  carbonReductionKg: 530.5,
  costSavingYuan: 1268.9,
  alarmCount: 2,
  deviceOnlineRate: 98.4,
}

export const buildingRanks: BuildingRank[] = [
  { name: 'A1 综合楼', loadKw: 126.4, ratio: 92 },
  { name: 'B2 实验楼', loadKw: 103.8, ratio: 76 },
  { name: 'C3 研发中心', loadKw: 88.6, ratio: 65 },
  { name: 'D4 展厅', loadKw: 62.7, ratio: 46 },
  { name: 'E5 后勤楼', loadKw: 51.3, ratio: 38 },
]

export const alarmEvents: AlarmEvent[] = [
  {
    id: 'ALM-20260705-001',
    level: 'critical',
    device: 'PCS-02',
    message: '储能 PCS 温度越限',
    time: '10:28:44',
  },
  {
    id: 'ALM-20260705-002',
    level: 'major',
    device: 'CP-18',
    message: '充电枪通信异常',
    time: '10:25:17',
  },
  {
    id: 'ALM-20260705-003',
    level: 'minor',
    device: 'INV-06',
    message: '逆变器效率波动',
    time: '10:19:36',
  },
]

export const energyFlows: EnergyFlow[] = [
  { from: '光伏阵列', to: '园区负荷', powerKw: 168.2, type: 'pv' },
  { from: '储能站', to: '园区负荷', powerKw: 80, type: 'storage' },
  { from: '电网接入', to: '园区负荷', powerKw: 150.7, type: 'grid' },
  { from: '园区母线', to: '充电站', powerKw: 95.6, type: 'charging' },
]

export function createTrendData(): TrendPoint[] {
  const data: TrendPoint[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    const sunlight = Math.max(0, Math.sin(((hour - 6) / 13) * Math.PI))
    const officeLoad = 0.65 + Math.max(0, Math.sin(((hour - 7) / 15) * Math.PI)) * 0.55
    const chargePeak = hour >= 8 && hour <= 21 ? 0.55 + Math.sin((hour / 24) * Math.PI) * 0.45 : 0.22
    const price = hour >= 18 && hour <= 21 ? 1.22 : hour >= 0 && hour <= 6 ? 0.34 : 0.72
    data.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      pv: Number((sunlight * 220 + Math.random() * 16).toFixed(1)),
      load: Number((officeLoad * 390 + Math.random() * 24).toFixed(1)),
      storage: Number(((hour >= 18 && hour <= 22 ? -90 : hour <= 6 ? 70 : 18) + Math.random() * 16).toFixed(1)),
      charging: Number((chargePeak * 130 + Math.random() * 18).toFixed(1)),
      price,
    })
  }
  return data
}

export function nextMetrics(previous: RealtimeMetrics): RealtimeMetrics {
  const wave = Math.sin(Date.now() / 4200)
  const pvPowerKw = clamp(previous.pvPowerKw + wave * 8 + randomBetween(-4, 7), 120, 260)
  const loadPowerKw = clamp(previous.loadPowerKw + randomBetween(-10, 13), 360, 560)
  const chargerPowerKw = clamp(previous.chargerPowerKw + randomBetween(-8, 10), 68, 168)
  const storagePower = loadPowerKw > 460 ? -randomBetween(62, 105) : randomBetween(20, 70)
  const chargerOccupiedCount = Math.round(clamp(previous.chargerOccupiedCount + randomBetween(-2, 2), 12, 35))
  const chargerFaultCount = Math.round(clamp(previous.chargerFaultCount + randomBetween(-0.3, 0.35), 1, 5))
  const chargerIdleCount = previous.chargerConnectorCount - chargerOccupiedCount - chargerFaultCount

  return {
    ...previous,
    pvPowerKw: round1(pvPowerKw),
    pvEnergyTodayKwh: round1(previous.pvEnergyTodayKwh + pvPowerKw / 360),
    pvEnergyMonthKwh: round1(previous.pvEnergyMonthKwh + pvPowerKw / 360),
    loadPowerKw: round1(loadPowerKw),
    loadEnergyTodayKwh: round1(previous.loadEnergyTodayKwh + loadPowerKw / 360),
    loadEnergyMonthKwh: round1(previous.loadEnergyMonthKwh + loadPowerKw / 360),
    storageSoc: round1(clamp(previous.storageSoc + (storagePower > 0 ? 0.08 : -0.12), 18, 96)),
    storageChargePowerKw: storagePower > 0 ? round1(storagePower) : 0,
    storageDischargePowerKw: storagePower < 0 ? round1(Math.abs(storagePower)) : 0,
    chargerPowerKw: round1(chargerPowerKw),
    chargerEnergyTodayKwh: round1(previous.chargerEnergyTodayKwh + chargerPowerKw / 360),
    chargerOccupiedCount,
    chargerFaultCount,
    chargerIdleCount,
    gridImportPowerKw: round1(clamp(loadPowerKw + chargerPowerKw - pvPowerKw - Math.max(0, Math.abs(storagePower)), 0, 260)),
    gridExportPowerKw: pvPowerKw > loadPowerKw ? round1((pvPowerKw - loadPowerKw) * 0.36) : 0,
    selfConsumptionRate: round1(clamp(84 + wave * 4 + randomBetween(-1.2, 1.2), 78, 96)),
    carbonReductionKg: round1(previous.carbonReductionKg + pvPowerKw * 0.0009),
    costSavingYuan: round1(previous.costSavingYuan + (pvPowerKw + Math.abs(storagePower)) * 0.002),
    alarmCount: chargerFaultCount >= 4 ? 3 : 2,
    deviceOnlineRate: round1(clamp(98.2 + randomBetween(-0.2, 0.2), 97.2, 99.5)),
  }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
