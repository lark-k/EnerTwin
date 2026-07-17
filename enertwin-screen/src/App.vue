<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import type { EChartsOption } from 'echarts'
import AlarmTicker from './components/AlarmTicker.vue'
import DigitalTwinScene from './components/DigitalTwinScene.vue'
import GlassPanel from './components/GlassPanel.vue'
import MetricFlip from './components/MetricFlip.vue'
import StatusRing from './components/StatusRing.vue'
import TopBar from './components/TopBar.vue'
import { useScreenStore } from './stores/screenStore'

const TrendChart = defineAsyncComponent(() => import('./components/TrendChart.vue'))

const store = useScreenStore()
const screenScale = ref(1)
const screenRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)
const sceneReady = ref(false)
const introStatus = ref('建立园区数据链路')
const staticQa = new URLSearchParams(window.location.search).has('qa')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const introVisible = ref(!staticQa && !reduceMotion)
const chartStage = ref(introVisible.value ? 0 : 2)
const sceneWarmupRequested = ref(!introVisible.value)
const warmupActive = ref(false)

let introTimeline: gsap.core.Timeline | null = null
let introProgressTween: gsap.core.Tween | null = null
let introMinimumTimer = 0
let introFallbackTimer = 0
let warmupMinimumTimer = 0
let warmupFallbackTimer = 0
let entryDelayTimer = 0
let introMinimumElapsed = false
let introClosing = false
let warmupStarted = false
let warmupMinimumElapsed = false
let warmupCompleted = false
let sceneWarmupReady = !introVisible.value
let introProgress = 8
const introPhaseTimers: number[] = []
const readyCharts = new Set<string>()

function updateScreenScale() {
  screenScale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
}

onMounted(async () => {
  updateScreenScale()
  window.addEventListener('resize', updateScreenScale)
  store.startMockStream()
  if (introVisible.value) {
    await nextTick()
    startIntroSequence()
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScreenScale)
  store.stopMockStream()
  window.clearTimeout(introMinimumTimer)
  window.clearTimeout(introFallbackTimer)
  window.clearTimeout(warmupMinimumTimer)
  window.clearTimeout(warmupFallbackTimer)
  window.clearTimeout(entryDelayTimer)
  introPhaseTimers.forEach((timer) => window.clearTimeout(timer))
  introTimeline?.kill()
  introProgressTween?.kill()
})

function startIntroSequence() {
  if (!introRef.value || !screenRef.value) return

  const dashboardParts = screenRef.value.querySelectorAll(
    '.top-bar, .left-stack > .glass-panel, .right-stack > .glass-panel, .bottom-dock, .benefit-float, .scene-hud',
  )
  gsap.set(dashboardParts, { opacity: 0 })

  introTimeline = gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.intro-kicker', { y: 16, opacity: 0, duration: 0.45 })
    .from('.intro-title-line', { y: 42, opacity: 0, skewY: 2, stagger: 0.09, duration: 0.72 }, '-=0.18')
    .from('.intro-core-shell', { scale: 0.45, opacity: 0, rotate: -18, duration: 0.9 }, '-=0.62')
    .from('.intro-orbit', { opacity: 0, stagger: 0.08, duration: 0.75 }, '-=0.65')
    .from('.intro-status-panel', { y: 22, opacity: 0, duration: 0.52 }, '-=0.28')
    .from('.intro-telemetry', { x: -24, opacity: 0, stagger: 0.08, duration: 0.48 }, '-=0.46')

  const progressState = { value: introProgress }
  renderIntroProgress(8)
  introProgressTween = gsap.to(progressState, {
    value: 88,
    duration: 3.1,
    ease: 'power2.inOut',
    onUpdate: () => {
      renderIntroProgress(progressState.value)
    },
  })

  scheduleIntroPhase(650, '同步能源资产拓扑')
  scheduleIntroPhase(1420, '校准光储充能量路由')
  scheduleIntroPhase(2240, '构建三维孪生场景')
  introMinimumTimer = window.setTimeout(() => {
    introMinimumElapsed = true
    if (sceneReady.value) beginResourceWarmup()
    else introStatus.value = '等待孪生模型响应'
  }, 3100)
  introFallbackTimer = window.setTimeout(() => beginResourceWarmup(true), 7200)
}

function scheduleIntroPhase(delay: number, label: string) {
  introPhaseTimers.push(window.setTimeout(() => {
    if (!introClosing) introStatus.value = label
  }, delay))
}

function renderIntroProgress(value: number) {
  if (!introRef.value) return
  const rounded = Math.round(value)
  if (rounded === introProgress && value !== 8) return
  introProgress = rounded

  const valueElement = introRef.value.querySelector<HTMLElement>('.intro-progress-value')
  const progressBar = introRef.value.querySelector<HTMLElement>('.intro-progress-track > i')
  const progressTrack = introRef.value.querySelector<HTMLElement>('.intro-progress-track')
  if (valueElement) valueElement.textContent = String(rounded).padStart(2, '0')
  if (progressBar) progressBar.style.transform = `scaleX(${rounded / 100})`
  progressTrack?.setAttribute('aria-valuenow', String(rounded))

  introRef.value.querySelectorAll<HTMLElement>('.intro-checkpoints span').forEach((checkpoint) => {
    checkpoint.classList.toggle('online', rounded >= Number(checkpoint.dataset.threshold ?? 100))
  })
}

function handleSceneReady() {
  sceneReady.value = true
  if (!introVisible.value) return
  introStatus.value = '数字孪生场景已就绪'
  if (introMinimumElapsed) beginResourceWarmup()
}

function beginResourceWarmup(force = false) {
  if (!introVisible.value || warmupStarted) return
  if (!force && (!sceneReady.value || !introMinimumElapsed)) return
  warmupStarted = true
  warmupActive.value = true
  window.clearTimeout(introFallbackTimer)
  introPhaseTimers.forEach((timer) => window.clearTimeout(timer))
  introStatus.value = '资源预热中 · 正在初始化运行环境'
  chartStage.value = 2
  sceneWarmupRequested.value = true

  introProgressTween?.kill()
  const progressState = { value: introProgress }
  introProgressTween = gsap.to(progressState, {
    value: 98,
    duration: 2.5,
    ease: 'power1.inOut',
    onUpdate: () => renderIntroProgress(progressState.value),
  })

  warmupMinimumTimer = window.setTimeout(() => {
    warmupMinimumElapsed = true
    checkResourceWarmup()
  }, 2200)
  warmupFallbackTimer = window.setTimeout(completeResourceWarmup, 6500)
}

function handleSceneWarmupReady() {
  sceneWarmupReady = true
  checkResourceWarmup()
}

function handleChartReady(key: string) {
  readyCharts.add(key)
  checkResourceWarmup()
}

function checkResourceWarmup() {
  if (!warmupStarted || warmupCompleted || !warmupMinimumElapsed) return
  if (!sceneReady.value || !sceneWarmupReady || readyCharts.size < 2) return
  completeResourceWarmup()
}

function completeResourceWarmup() {
  if (!warmupStarted || warmupCompleted) return
  warmupCompleted = true
  window.clearTimeout(warmupMinimumTimer)
  window.clearTimeout(warmupFallbackTimer)
  introProgressTween?.kill()
  renderIntroProgress(100)
  introStatus.value = '全部资源已就绪 · 正在进入系统'
  entryDelayTimer = window.setTimeout(finishIntroSequence, 520)
}

function requestIntroSkip() {
  introMinimumElapsed = true
  beginResourceWarmup(true)
}

function finishIntroSequence() {
  if (!introVisible.value || introClosing || !introRef.value || !screenRef.value) return
  introClosing = true
  window.clearTimeout(introMinimumTimer)
  window.clearTimeout(introFallbackTimer)
  introPhaseTimers.forEach((timer) => window.clearTimeout(timer))
  introProgressTween?.kill()
  renderIntroProgress(100)
  introStatus.value = '系统就绪 · 场景接管'

  const leftPanels = screenRef.value.querySelectorAll('.left-stack > .glass-panel')
  const rightPanels = screenRef.value.querySelectorAll('.right-stack > .glass-panel')
  const utilityParts = screenRef.value.querySelectorAll('.bottom-dock, .benefit-float, .scene-hud')

  gsap
    .timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        introVisible.value = false
      },
    })
    .to('.intro-core-shell', { scale: 2.25, rotate: 36, opacity: 0, duration: 0.62, ease: 'power2.in' })
    .to(introRef.value, { opacity: 0, scaleY: 0.015, duration: 0.68, transformOrigin: '50% 50%', ease: 'power3.inOut' }, '-=0.34')
    .fromTo('.top-bar', { y: -34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62 }, '-=0.22')
    .fromTo(leftPanels, { x: -46, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.56 }, '-=0.46')
    .fromTo(rightPanels, { x: 46, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.07, duration: 0.56 }, '<')
    .fromTo(utilityParts, { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.52 }, '-=0.36')
}

const energyChartOption = computed<EChartsOption>(() => ({
  animationDuration: 680,
  animationDurationUpdate: 240,
  animationEasingUpdate: 'linear',
  grid: { left: 43, right: 18, top: 42, bottom: 24 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(2,13,31,0.94)',
    borderColor: '#00d9ff',
    textStyle: { color: '#eaf7ff' },
  },
  legend: {
    top: 3,
    right: 12,
    itemWidth: 18,
    itemHeight: 8,
    textStyle: { color: '#91abc8', fontSize: 12 },
  },
  xAxis: {
    type: 'category',
    data: store.trend.map((item) => item.time),
    axisLine: { lineStyle: { color: '#18466f' } },
    axisTick: { show: false },
    axisLabel: { color: '#7696b7', interval: 2, fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    min: -100,
    max: 500,
    interval: 100,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: 'rgba(77,137,191,0.18)' } },
    axisLabel: { color: '#7696b7', fontSize: 11 },
  },
  series: [
    smoothLine('光伏发电', store.trend.map((item) => item.pv), '#28df83'),
    smoothLine('园区负荷', store.trend.map((item) => item.load), '#00d9ff'),
    smoothLine('储能功率', store.trend.map((item) => item.storage), '#845cff'),
    smoothLine('充电负荷', store.trend.map((item) => item.charging), '#ff5366'),
  ],
}))

const strategyChartOption = computed<EChartsOption>(() => ({
  animationDuration: 680,
  animationDurationUpdate: 240,
  animationEasingUpdate: 'linear',
  grid: { left: 42, right: 18, top: 34, bottom: 24 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(2,13,31,0.94)',
    borderColor: '#ffb21b',
    textStyle: { color: '#eaf7ff' },
  },
  xAxis: {
    type: 'category',
    data: store.trend.map((item) => item.time),
    axisTick: { show: false },
    axisLabel: { color: '#7696b7', interval: 3, fontSize: 11 },
    axisLine: { lineStyle: { color: '#18466f' } },
  },
  yAxis: {
    type: 'value',
    min: 0.2,
    max: 1.4,
    interval: 0.2,
    axisLabel: { color: '#7696b7', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(77,137,191,0.18)' } },
  },
  series: [
    {
      name: '分时电价',
      type: 'bar',
      data: store.trend.map((item) => item.price),
      itemStyle: { color: '#ffb21b', borderRadius: [4, 4, 0, 0] },
      barWidth: 14,
    },
    {
      name: '调度阈值',
      type: 'line',
      data: store.trend.map((item) => (item.price > 1 ? 1.18 : item.price < 0.5 ? 0.35 : 0.72)),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#22ef8a', width: 2 },
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
    lineStyle: {
      color,
      width: 2.2,
      shadowColor: `${color}72`,
      shadowBlur: 6,
    },
    areaStyle: {
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: `${color}42` },
          { offset: 1, color: `${color}00` },
        ],
      },
    },
  }
}
</script>

<template>
  <main class="viewport-shell" :class="{ day: !store.nightMode }">
    <div ref="screenRef" class="screen-shell" :class="{ 'intro-active': introVisible }" :style="{ '--screen-scale': screenScale }">
      <div class="particle-layer" aria-hidden="true"></div>
      <div class="aurora-layer" aria-hidden="true"></div>
      <div class="frame-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

      <section v-if="introVisible" ref="introRef" class="intro-stage" :class="{ 'warmup-active': warmupActive }" aria-label="EnerTwin 数字孪生系统启动中" aria-live="polite">
        <div class="intro-grid" aria-hidden="true"></div>
        <div class="intro-scanline" aria-hidden="true"></div>
        <div class="intro-energy-beams" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

        <button class="intro-skip" type="button" @click="requestIntroSkip">跳过动画 <span>SKIP</span></button>

        <header class="intro-heading">
          <p class="intro-kicker"><i></i> ENERTWIN / DIGITAL CAMPUS <i></i></p>
          <h1>
            <span class="intro-title-line">光储充协同能源</span>
            <span class="intro-title-line">数字孪生平台</span>
          </h1>
        </header>

        <aside class="intro-telemetry intro-telemetry-left" aria-hidden="true">
          <span>ENERGY LINK</span><strong>04 / 04</strong><i></i>
          <small>PV · ESS · EV · GRID</small>
        </aside>
        <aside class="intro-telemetry intro-telemetry-right" aria-hidden="true">
          <span>TWIN ENGINE</span><strong>SYNC</strong><i></i>
          <small>SPATIAL DATA ONLINE</small>
        </aside>

        <div class="intro-core-zone" aria-hidden="true">
          <span class="intro-orbit intro-orbit-a"></span>
          <span class="intro-orbit intro-orbit-b"></span>
          <span class="intro-orbit intro-orbit-c"></span>
          <span class="intro-orbit intro-orbit-d"></span>
          <div class="intro-core-shell">
            <i></i><i></i><i></i>
            <strong>ET</strong>
            <small>DIGITAL TWIN</small>
          </div>
        </div>

        <div class="intro-status-panel">
          <div class="intro-status-copy">
            <span>{{ introStatus }}</span>
            <strong><span class="intro-progress-value">08</span><small>%</small></strong>
          </div>
          <div class="intro-progress-track" role="progressbar" aria-label="数字孪生场景加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8"><i></i></div>
          <div class="intro-checkpoints">
            <span data-threshold="20"><i></i>数据链路</span>
            <span data-threshold="42"><i></i>资产拓扑</span>
            <span data-threshold="68"><i></i>能量路由</span>
            <span data-threshold="88"><i></i>场景渲染</span>
          </div>
        </div>
      </section>

      <TopBar
        :park-name="store.parkName"
        :mode="store.mode"
        :night-mode="store.nightMode"
        @update:mode="store.mode = $event"
        @update:night-mode="store.nightMode = $event"
      />

      <section class="scene-wrap" aria-label="可自由观察的三维数字孪生园区">
        <DigitalTwinScene
          :mode="store.mode"
          :night-mode="store.nightMode"
          :alarm-count="store.metrics.alarmCount"
          :storage-soc="store.metrics.storageSoc"
          :pv-power-kw="store.metrics.pvPowerKw"
          :load-power-kw="store.metrics.loadPowerKw"
          :charger-power-kw="store.metrics.chargerPowerKw"
          :intro-active="introVisible"
          :warmup-requested="sceneWarmupRequested"
          @focus-mode="store.mode = $event"
          @ready="handleSceneReady"
          @warmup-ready="handleSceneWarmupReady"
        />
        <div class="scene-hud">
          <header><span>ENERGY FLOW / 实时能量流</span><i>LIVE</i></header>
          <strong>{{ store.metrics.pvPowerKw }} <small>kW</small></strong>
          <div class="flow-route">
            <b>PV</b><i>→</i><b>LOAD</b><i>·</i><b>STORAGE</b><i>·</i><b>CHARGE</b>
          </div>
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
            <div class="metric-grid metric-grid-six">
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
          <TrendChart v-if="chartStage >= 1" :option="energyChartOption" @ready="handleChartReady('energy')" />
          <div v-else class="trend-chart-placeholder" aria-hidden="true"></div>
        </GlassPanel>
        <GlassPanel title="分时电价与调度策略" accent="green">
          <TrendChart v-if="chartStage >= 2" :option="strategyChartOption" @ready="handleChartReady('strategy')" />
          <div v-else class="trend-chart-placeholder" aria-hidden="true"></div>
        </GlassPanel>
      </footer>

      <aside class="benefit-float">
        <MetricFlip label="碳减排量" :value="store.metrics.carbonReductionKg" unit="kg" tone="green" />
        <MetricFlip label="节约电费" :value="store.metrics.costSavingYuan" unit="元" tone="amber" />
        <MetricFlip label="馈电功率" :value="store.metrics.gridExportPowerKw" unit="kW" tone="cyan" />
      </aside>
    </div>
  </main>
</template>
