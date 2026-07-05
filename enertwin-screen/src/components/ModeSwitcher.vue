<script setup lang="ts">
import { Bell, BatteryCharging, Building2, CarFront, Grid3X3, SunMedium, Zap } from 'lucide-vue-next'
import type { SceneMode } from '../types'

defineProps<{
  modelValue: SceneMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SceneMode]
}>()

const modes = [
  { value: 'overview', label: '总览', icon: Grid3X3 },
  { value: 'pv', label: '光伏', icon: SunMedium },
  { value: 'storage', label: '储能', icon: BatteryCharging },
  { value: 'charging', label: '充电', icon: CarFront },
  { value: 'building', label: '楼宇', icon: Building2 },
  { value: 'alarm', label: '告警', icon: Bell },
] satisfies Array<{ value: SceneMode; label: string; icon: typeof Zap }>
</script>

<template>
  <div class="mode-switcher" role="tablist" aria-label="场景模式">
    <button
      v-for="item in modes"
      :key="item.value"
      type="button"
      :class="{ active: modelValue === item.value }"
      :title="`${item.label}模式`"
      @click="emit('update:modelValue', item.value)"
    >
      <component :is="item.icon" :size="15" />
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>
