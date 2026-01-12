<script setup>
import { NConfigProvider, darkTheme } from 'naive-ui';
// Usamos NConfigProvider para forzar el modo oscuro en toda la app (se ve mejor con 3D)
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <router-view />
  </n-config-provider>
</template>

<style>
/* Reset básico global */
body {
  margin: 0;
  padding: 0;
  background-color: #101014; /* Color de fondo oscuro de Naive UI */
  color: white;
  font-family: 'Fira Code', monospace, sans-serif; /* Opcional */
}
</style>