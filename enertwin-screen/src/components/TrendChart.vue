<script setup lang="ts">
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

const props = defineProps<{
  option: EChartsOption
}>()

const emit = defineEmits<{
  ready: []
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: EChartsType | null = null
let observer: ResizeObserver | null = null
let resizeFrame = 0
let readyTimer = 0
let readyEmitted = false

function signalReady() {
  if (readyEmitted) return
  readyEmitted = true
  window.clearTimeout(readyTimer)
  emit('ready')
}

onMounted(() => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, undefined, {
    renderer: 'canvas',
    devicePixelRatio: Math.min(window.devicePixelRatio, 1),
    useDirtyRect: true,
  })
  chart.on('finished', signalReady)
  chart.setOption(props.option, { notMerge: true, lazyUpdate: true })
  readyTimer = window.setTimeout(signalReady, 1200)
  observer = new ResizeObserver(() => {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = window.requestAnimationFrame(() => chart?.resize({ silent: true }))
  })
  observer.observe(chartRef.value)
})

watch(
  () => props.option,
  (option) => chart?.setOption(option, { notMerge: true, lazyUpdate: true }),
)

onBeforeUnmount(() => {
  window.clearTimeout(readyTimer)
  window.cancelAnimationFrame(resizeFrame)
  observer?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div ref="chartRef" class="trend-chart"></div>
</template>
