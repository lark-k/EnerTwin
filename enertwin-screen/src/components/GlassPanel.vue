<script setup lang="ts">
defineProps<{
  title: string
  accent?: 'cyan' | 'green' | 'blue' | 'purple' | 'red' | 'amber'
}>()
</script>

<template>
  <section class="glass-panel" :class="`panel-${accent ?? 'cyan'}`" :data-accent="accent ?? 'cyan'">
    <i class="panel-corner panel-corner-tl" aria-hidden="true"></i>
    <i class="panel-corner panel-corner-tr" aria-hidden="true"></i>
    <i class="panel-corner panel-corner-bl" aria-hidden="true"></i>
    <i class="panel-corner panel-corner-br" aria-hidden="true"></i>
    <header class="panel-header">
      <span class="panel-kicker"></span>
      <div class="panel-heading">
        <h2>{{ title }}</h2>
      </div>
      <span class="panel-channel" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="panel-live"><i></i> SYNC</span>
      <slot name="action"></slot>
    </header>
    <div class="panel-body">
      <slot></slot>
    </div>
  </section>
</template>
