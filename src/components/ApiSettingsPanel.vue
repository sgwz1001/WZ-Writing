<script setup lang="ts">
import AiConfigPanel from './ai/AiConfigPanel.vue'
</script>

<template>
  <AiConfigPanel @close="$emit('close')" />
</template>
