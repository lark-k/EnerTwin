<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import type { EChartsOption } from 'echarts'
import AlarmTicker from './components/AlarmTicker.vue'
import DigitalTwinScene from './components/DigitalTwinScene.vue'
import GlassPanel from './components/GlassPanel.vue'
import MetricFlip from './components/MetricFlip.vue'
import StatusRing from './components/StatusRing.vue'
import TopBar from './components/TopBar.vue'
import TrendChart from './components/TrendChart.vue'
import { useScreenStore } from './stores/screenStore'

const store = useScreenStore()
const introVisible = ref(true)
const appRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)

onMounted(() => {
  store.startMockStream()
  window.setTimeout(() => {
    introVisible.value = false
  }, 3200)
  if (introRef.value) {
    gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          introVisible.value = false
          if (appRef.value) gsap.fromTo(appRef.value, { opacity: 0.78 }, { opacity: 1, duration: 0.5 })
        },
      })
      .from('.intro-brand span', { y: 18, opacity: 0, duration: 0.45 })
      .from('.intro-brand h1', { y: 28, opacity: 0, duration: 0.65 }, '-=0.15')
      .from('.orbit-ring', { scale: 0.35, opacity: 0, stagger: 0.12, duration: 0.8 }, '-=0.35')
      .to(introRef.value, { opacity: 0, duration: 0.55, delay: 0.65 })
  }
})

onBeforeUnmount(() => {
  store.stopMockStream()
})

const energyChartOption = computed<EChartsOption>(() => ({
  animationDuration: 680,
  grid: { left: 34, right: 14, top: 26, bottom: 20 },
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,16,34,0.92)', borderColor: '#00e5ff', textStyle: { color: '#eaf6ff' } },
  legend: { top: 0, right: 8, textStyle: { color: '#8fb6d8' } },
  xAxis: { type: 'category', data: store.trend.map((item) => item.time), axisLine: { lineStyle: { color: '#1e6b8d' } }, axisLabel: { color: '#8fb6d8' } },
  yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(143,182,216,0.14)' } }, axisLabel: { color: '#8fb6d8' } },
  series: [
    smoothLine('光伏发电', store.trend.map((item) => item.pv), '#22f59a'),
    smoothLine('园区负荷', store.trend.map((item) => item.load), '#00e5ff'),
    smoothLine('储能功率', store.trend.map((item) => item.storage), '#39a7ff'),
    smoothLine('充电负荷', store.trend.map((item) => item.charging), '#8a6cff'),
  ],
}))

const strategyChartOption = computed<EChartsOption>(() => ({
  animationDuration: 680,
  grid: { left: 34, right: 12, top: 20, bottom: 20 },
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,16,34,0.92)', borderColor: '#22f59a', textStyle: { color: '#eaf6ff' } },
  xAxis: { type: 'category', data: store.trend.map((item) => item.time), axisLabel: { color: '#8fb6d8' }, axisLine: { lineStyle: { color: '#1e6b8d' } } },
  yAxis: [
    { type: 'value', name: '元/kWh', nameTextStyle: { color: '#8fb6d8' }, axisLabel: { color: '#8fb6d8' }, splitLine: { lineStyle: { color: 'rgba(143,182,216,0.14)' } } },
  ],
  series: [
    {
      name: '分时电价',
      type: 'bar',
      data: store.trend.map((item) => item.price),
      itemStyle: { color: '#ffb020', borderRadius: [4, 4, 0, 0] },
      barWidth: 12,
    },
    {
      name: '调度建议',
      type: 'line',
      data: store.trend.map((item) => (item.price > 1 ? 1.2 : item.price < 0.5 ? 0.35 : 0.72)),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#22f59a', width: 2 },
    },
  ],
}))

function smoothLine(name: string, data: number[], color: string) {
  return {
    name,
    type: 'line' as const,
    data,
    smooth: true,
    symbol: 'none' as const,
    lineStyle: { color, width: 2 },
    areaStyle: {
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: `${color}55` },
          { offset: 1, color: `${color}00` },
        ],
      },
    },
  }
}
</script>

<template>
  <main ref="appRef" class="screen-shell" :class="{ day: !store.nightMode }">
    <div class="particle-layer"></div>

    <section v-if="introVisible" ref="introRef" class="intro-stage" aria-label="EnerTwin 入口动画">
      <div class="intro-planet">
        <span class="orbit-ring orbit-pv"></span>
        <span class="orbit-ring orbit-storage"></span>
        <span class="orbit-ring orbit-charging"></span>
        <span class="orbit-ring orbit-grid"></span>
      </div>
      <div class="intro-brand">
        <span>EnerTwin</span>
        <h1>光储充协同能源数字孪生平台</h1>
      </div>
    </section>

    <TopBar
      :park-name="store.parkName"
      :mode="store.mode"
      :night-mode="store.nightMode"
      @update:mode="store.mode = $event"
      @update:night-mode="store.nightMode = $event"
    />

    <section class="scene-wrap">
      <DigitalTwinScene
        :mode="store.mode"
        :night-mode="store.nightMode"
        :alarm-count="store.metrics.alarmCount"
        :storage-soc="store.metrics.storageSoc"
        :pv-power-kw="store.metrics.pvPowerKw"
        :load-power-kw="store.metrics.loadPowerKw"
        :charger-power-kw="store.metrics.chargerPowerKw"
      />
      <div class="scene-hud">
        <span>实时能量流</span>
        <strong>{{ store.metrics.pvPowerKw }} kW</strong>
        <em>PV -> Load / Storage / Charge</em>
      </div>
    </section>

    <div class="screen-grid">
      <aside class="panel-stack left-stack">
        <GlassPanel title="能源资产总览" accent="cyan">
          <div class="metric-grid">
            <MetricFlip label="光伏装机" :value="store.metrics.pvCapacityMw" unit="MW" tone="green" />
            <MetricFlip label="充电枪" :value="store.metrics.chargerConnectorCount" unit="把" tone="purple" />
            <MetricFlip label="告警数量" :value="store.metrics.alarmCount" unit="条" tone="red" />
            <MetricFlip label="在线率" :value="store.metrics.deviceOnlineRate" unit="%" tone="cyan" />
          </div>
        </GlassPanel>

        <GlassPanel title="光伏运行状态" accent="green">
          <div class="metric-grid">
            <MetricFlip label="实时功率" :value="store.metrics.pvPowerKw" unit="kW" tone="green" />
            <MetricFlip label="今日发电" :value="store.metrics.pvEnergyTodayKwh" unit="kWh" tone="cyan" />
            <MetricFlip label="本月发电" :value="store.metrics.pvEnergyMonthKwh" unit="kWh" tone="blue" />
            <MetricFlip label="自发自用" :value="store.metrics.selfConsumptionRate" unit="%" tone="green" />
          </div>
        </GlassPanel>

        <GlassPanel title="储能运行状态" accent="blue">
          <div class="ring-row">
            <StatusRing label="SOC" :value="store.metrics.storageSoc" tone="blue" />
            <StatusRing label="SOH" :value="store.metrics.storageSoh" tone="green" />
          </div>
          <div class="metric-grid compact">
            <MetricFlip label="充电功率" :value="store.metrics.storageChargePowerKw" unit="kW" tone="blue" />
            <MetricFlip label="放电功率" :value="store.metrics.storageDischargePowerKw" unit="kW" tone="amber" />
          </div>
        </GlassPanel>
      </aside>

      <aside class="panel-stack right-stack">
        <GlassPanel title="用电统计" accent="cyan">
          <div class="metric-grid">
            <MetricFlip label="实时总负荷" :value="store.metrics.loadPowerKw" unit="kW" tone="cyan" />
            <MetricFlip label="今日用电" :value="store.metrics.loadEnergyTodayKwh" unit="kWh" tone="blue" />
            <MetricFlip label="本月用电" :value="store.metrics.loadEnergyMonthKwh" unit="kWh" tone="purple" />
            <MetricFlip label="购电功率" :value="store.metrics.gridImportPowerKw" unit="kW" tone="amber" />
          </div>
        </GlassPanel>

        <GlassPanel title="充电运营" accent="purple">
          <div class="metric-grid">
            <MetricFlip label="充电桩" :value="store.metrics.chargerPileCount" unit="台" tone="purple" />
            <MetricFlip label="使用中" :value="store.metrics.chargerOccupiedCount" unit="把" tone="green" />
            <MetricFlip label="空闲" :value="store.metrics.chargerIdleCount" unit="把" tone="cyan" />
            <MetricFlip label="故障" :value="store.metrics.chargerFaultCount" unit="把" tone="red" />
            <MetricFlip label="当前功率" :value="store.metrics.chargerPowerKw" unit="kW" tone="purple" />
            <MetricFlip label="今日电量" :value="store.metrics.chargerEnergyTodayKwh" unit="kWh" tone="blue" />
          </div>
        </GlassPanel>

        <GlassPanel title="楼宇用能排行" accent="amber">
          <div class="rank-list">
            <div v-for="item in store.buildingRanks" :key="item.name" class="rank-item">
              <span>{{ item.name }}</span>
              <strong>{{ item.loadKw }} kW</strong>
              <i :style="{ width: `${item.ratio}%` }"></i>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel title="实时告警" accent="red">
          <AlarmTicker :alarms="store.alarmEvents" />
        </GlassPanel>
      </aside>
    </div>

    <footer class="bottom-dock">
      <GlassPanel title="今日能源趋势" accent="cyan">
        <TrendChart :option="energyChartOption" />
      </GlassPanel>
      <GlassPanel title="分时电价与调度策略" accent="green">
        <TrendChart :option="strategyChartOption" />
      </GlassPanel>
    </footer>

    <aside class="benefit-float">
      <MetricFlip label="碳减排量" :value="store.metrics.carbonReductionKg" unit="kg" tone="green" />
      <MetricFlip label="节约电费" :value="store.metrics.costSavingYuan" unit="元" tone="amber" />
      <MetricFlip label="馈电功率" :value="store.metrics.gridExportPowerKw" unit="kW" tone="cyan" />
    </aside>
  </main>
</template>
