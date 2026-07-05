<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Maximize2, Moon, SunMedium } from 'lucide-vue-next'
import ModeSwitcher from './ModeSwitcher.vue'
import type { SceneMode } from '../types'

const props = defineProps<{
  parkName: string
  mode: SceneMode
  nightMode: boolean
}>()

const emit = defineEmits<{
  'update:mode': [value: SceneMode]
  'update:nightMode': [value: boolean]
}>()

const now = ref(new Date())
let timer: number | undefined

const formattedTime = computed(() =>
  now.value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }),
)

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})

function requestFullscreen() {
  document.documentElement.requestFullscreen?.()
}
</script>

<template>
  <header class="top-bar">
    <div class="brand-lockup">
      <span>EnerTwin</span>
      <h1>光储充协同能源数字孪生平台</h1>
    </div>
    <div class="top-meta">
      <span>{{ parkName }}</span>
      <span>{{ formattedTime }}</span>
      <span>多云 31°C 东南风 2级</span>
    </div>
    <ModeSwitcher :model-value="props.mode" @update:model-value="emit('update:mode', $event)" />
    <button
      class="icon-button"
      type="button"
      :title="props.nightMode ? '切换日间模式' : '切换夜间模式'"
      @click="emit('update:nightMode', !props.nightMode)"
    >
      <Moon v-if="props.nightMode" :size="18" />
      <SunMedium v-else :size="18" />
    </button>
    <button class="icon-button" type="button" title="全屏" @click="requestFullscreen">
      <Maximize2 :size="18" />
    </button>
  </header>
</template>
