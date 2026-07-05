<script setup lang="ts">
defineProps<{
  title: string
  accent?: 'cyan' | 'green' | 'blue' | 'purple' | 'red' | 'amber'
}>()
</script>

<template>
  <section class="glass-panel" :class="`panel-${accent ?? 'cyan'}`">
    <header class="panel-header">
      <span class="panel-kicker"></span>
      <h2>{{ title }}</h2>
      <slot name="action"></slot>
    </header>
    <div class="panel-body">
      <slot></slot>
    </div>
  </section>
</template>
