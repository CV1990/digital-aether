import { createRouter, createWebHistory } from 'vue-router';
// Importamos el Layout principal que contiene el Menú Lateral
import DashboardLayout from '../layouts/DashboardLayout.vue';

const routes = [
  {
    path: '/',
    component: DashboardLayout,
    // Redireccionamos automáticamante al primer demo para que no se vea vacío al entrar
    redirect: '/demo/digital-aether',
    children: [
      {
        path: '/demo/digital-aether',
        name: 'digital-aether',
        // Lazy Loading: El código de este demo solo se baja si el usuario lo visita.
        // Esto es CLAVE en 3D para no bloquear el navegador al inicio.
        component: () => import('../demos/Space/index.vue'),
        meta: { title: 'Digital Aether | Particles' }
      },
      {
        path: '/demo/neon-horizon',
        name: 'neon-horizon',
        component: () => import('../demos/NeonHorizon/index.vue'),
        meta: { title: 'Neon Horizon | Synthwave' }
      },
      {
        path: '/demo/liquid-chrome',
        name: 'liquid-chrome',
        component: () => import('../demos/LiquidChrome/index.vue'),
        meta: { title: 'Liquid Chrome | Shader Art' }
      },
      {
        path: '/demo/solar-storm',
        name: 'solar-storm',
        component: () => import('../demos/SolarStorm/index.vue'),
        meta: { title: 'Solar Storm | GLSL' }
      },
      {
        path: '/demo/geometric-hive',
        name: 'geometric-hive',
        component: () => import('../demos/GeometricHive/index.vue'),
        meta: { title: 'Geometric Hive | Instancing' }
      },
      {
        path: '/demo/auth-field',
        name: 'auth-field',
        component: () => import('../demos/AuthField/index.vue'),
        meta: { title: 'Auth Field | Interactive Login' }
      },
      {
        path: '/demo/cyber-dashboard',
        name: 'cyber-dashboard',
        component: () => import('../demos/CyberDashboard/index.vue'),
        meta: { title: 'Cyber Ops | Dashboard' }
      },
      {
        path: '/demo/spatial-dashboard',
        name: 'spatial-dashboard',
        component: () => import('../demos/SpatialDashboard/index.vue'),
        meta: { title: 'Spatial Analytics | Business' }
      },
      {
        path: '/demo/neural-nexus',
        name: 'neural-nexus',
        component: () => import('../demos/NeuralNexus/index.vue'),
        meta: { title: 'Neural Nexus | Big Data' }
      },
      {
        path: '/demo/logistics-center',
        name: 'logistics-center',
        component: () => import('../demos/LogisticsCenter/index.vue'),
        meta: { title: 'Logistics Center | Fleet Command' }
      },
      {
        path: '/demo/global-sales',
        name: 'global-sales',
        component: () => import('../demos/GlobalSales/index.vue'),
        meta: { title: 'Global Sales | Nexus' }
      },
      {
        path: '/demo/investment-hub',
        name: 'investment-hub',
        component: () => import('../demos/InvestmentHub/index.vue'), // Asegúrate de guardar el archivo anterior en esta carpeta
        meta: { title: 'Investment Hub | Cosmic' }
      }
      // Aquí irás agregando más objetos conforme crees más demos
    ]
  },
  // Captura cualquier ruta desconocida y mándala al inicio (404 handling simple)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(), // Usa URLs limpias (sin #)
  routes
})

// Opcional: Cambiar el título de la pestaña del navegador al navegar
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Carlos Rivas | 3D Portfolio';
  next();
});

export default router