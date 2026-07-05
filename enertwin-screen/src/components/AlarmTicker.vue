<script setup lang="ts">
import type { AlarmEvent } from '../types'

defineProps<{
  alarms: AlarmEvent[]
}>()
</script>

<template>
  <div class="alarm-ticker">
    <article v-for="alarm in alarms" :key="alarm.id" :class="`alarm-${alarm.level}`">
      <span class="alarm-time">{{ alarm.time }}</span>
      <strong>{{ alarm.device }}</strong>
      <p>{{ alarm.message }}</p>
    </article>
  </div>
</template>
