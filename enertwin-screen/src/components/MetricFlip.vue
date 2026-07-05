<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number | string
  unit?: string
  tone?: 'cyan' | 'green' | 'blue' | 'purple' | 'red' | 'amber'
}>()

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value >= 1000 ? props.value.toLocaleString('zh-CN') : props.value
  }
  return props.value
})
</script>

<template>
  <div class="metric-flip" :class="`tone-${tone ?? 'cyan'}`">
    <span class="metric-label">{{ label }}</span>
    <strong class="metric-value" :key="displayValue">{{ displayValue }}</strong>
    <span v-if="unit" class="metric-unit">{{ unit }}</span>
  </div>
</template>
