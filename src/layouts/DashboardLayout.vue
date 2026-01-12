<script setup>
import {
  BarChartOutline as ChartIcon,
  CubeOutline as CubeIcon,
  PlanetOutline as GalaxyIcon,
  EarthOutline as GlobalIcon,
  GlobeOutline as GlobeIcon,
  StatsChartOutline as GraphIcon,
  LockClosedOutline as LockIcon,
  MapOutline as MapIcon,
  PieChartOutline as PieIcon,
  SunnyOutline as SunIcon,
  WalletOutline as WalletIcon,
  WaterOutline as WaterIcon
} from '@vicons/ionicons5';
import { NIcon, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NMenu } from 'naive-ui'; // Agregué NLayoutHeader
import { h, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

// Configuración del Menú
const menuOptions = [
  {
    label: () => h(RouterLink, { to: '/demo/digital-aether' }, { default: () => 'Digital Aether' }),
    key: 'digital-aether',
    icon: () => h(NIcon, null, { default: () => h(GalaxyIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/neon-horizon' }, { default: () => 'Neon Horizon' }),
    key: 'neon-horizon',
    icon: () => h(NIcon, null, { default: () => h(GraphIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/liquid-chrome' }, { default: () => 'Liquid Chrome' }),
    key: 'liquid-chrome',
    icon: () => h(NIcon, null, { default: () => h(WaterIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/solar-storm' }, { default: () => 'Solar Storm' }),
    key: 'solar-storm',
    icon: () => h(NIcon, null, { default: () => h(SunIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/geometric-hive' }, { default: () => 'Geometric Hive' }),
    key: 'geometric-hive',
    icon: () => h(NIcon, null, { default: () => h(CubeIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/auth-field' }, { default: () => 'Auth Field' }),
    key: 'auth-field',
    icon: () => h(NIcon, null, { default: () => h(LockIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/cyber-dashboard' }, { default: () => 'Cyber Dashboard' }),
    key: 'cyber-dashboard',
    icon: () => h(NIcon, null, { default: () => h(ChartIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/spatial-dashboard' }, { default: () => 'Spatial Analytics' }),
    key: 'spatial-dashboard',
    icon: () => h(NIcon, null, { default: () => h(PieIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/neural-nexus' }, { default: () => 'Neural Nexus' }),
    key: 'neural-nexus',
    icon: () => h(NIcon, null, { default: () => h(GlobeIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/logistics-center' }, { default: () => 'Logistics Center' }),
    key: 'logistics-center',
    icon: () => h(NIcon, null, { default: () => h(MapIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/global-sales' }, { default: () => 'Global Sales Nexus' }),
    key: 'global-sales',
    icon: () => h(NIcon, null, { default: () => h(GlobalIcon) })
  },
  {
    label: () => h(RouterLink, { to: '/demo/investment-hub' }, { default: () => 'Cosmic Investment' }),
    key: 'investment-hub',
    icon: () => h(NIcon, null, { default: () => h(WalletIcon) })
  }
]

const collapsed = ref(false)
const route = useRoute()
</script>

<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed"
      show-trigger @collapse="collapsed = true" @expand="collapsed = false" style="background: #0a0a0a;">
      <div class="logo-container">
        <span v-if="!collapsed" class="logo-text">CR | 3D Lab</span>
        <span v-else class="logo-text">CR</span>
      </div>

      <n-menu :collapsed="collapsed" :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions"
        :value="route.name" theme="dark" />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered
        style="height: 60px; padding: 0 20px; display:flex; align-items:center; justify-content: space-between;">
        <h3>Exploración Visual</h3>
        <div class="socials">LinkedIn / GitHub</div>
      </n-layout-header>

      <n-layout-content content-style="padding: 0px; height: calc(100vh - 60px); overflow: hidden;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
  border-bottom: 1px solid #333;
}

.logo-text {
  font-weight: bold;
  font-size: 1.2rem;
  letter-spacing: 2px;
}
</style>