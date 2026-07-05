<script setup lang="ts">
const props = defineProps<{
  label: string
  value: number
  unit?: string
  tone?: 'cyan' | 'green' | 'blue' | 'purple' | 'red' | 'amber'
}>()
</script>

<template>
  <div class="status-ring" :class="`tone-${props.tone ?? 'green'}`" :style="{ '--value': props.value }">
    <div class="ring-core">
      <strong>{{ props.value }}</strong>
      <span>{{ props.unit ?? '%' }}</span>
    </div>
    <p>{{ props.label }}</p>
  </div>
</template>
