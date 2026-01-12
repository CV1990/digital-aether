<script setup>
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { onMounted, onUnmounted, ref } from 'vue';

import {
    StatsChartOutline as AnalyticsIcon,
    GridOutline as DashboardIcon,
    PieChartOutline as ReportsIcon,
    SettingsOutline as SettingsIcon
} from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';

// --- DATOS VUE ---
const activeTab = ref('overview');

const dashboardData = {
    overview: {
        title: 'General Overview',
        color: new THREE.Color(0x00f2ff), // Cyan Eléctrico
        accent: '#00f2ff',
        kpis: { revenue: '$124k', profit: '$45k', growth: '+12%' },
        chartData: [4, 7, 5, 8, 6, 9, 10, 8, 6, 5, 7, 9] 
    },
    analytics: {
        title: 'Real-time Analytics',
        color: new THREE.Color(0xff0055), // Rojo/Rosa Neón
        accent: '#ff0055',
        kpis: { revenue: '$86k', profit: '$21k', growth: '-2.4%' },
        chartData: [2, 3, 9, 2, 4, 8, 2, 4, 9, 10, 2, 3] 
    },
    reports: {
        title: 'Yearly Reports',
        color: new THREE.Color(0xccff00), // Lima Neón
        accent: '#ccff00',
        kpis: { revenue: '$1.2M', profit: '$840k', growth: '+24%' },
        chartData: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] 
    }
};

// --- SHADERS GLSL (LA MAGIA) ---

// 1. Vertex Shader: Pasa las coordenadas UV y la posición
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// 2. Fragment Shader: Crea el gradiente y la animación
const fragmentShader = `
    uniform vec3 uColor;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
        // 1. Gradiente Vertical (Más transparente abajo, sólido arriba)
        float opacity = smoothstep(0.0, 1.0, vUv.y); 
        
        // 2. Scanline Effect (Línea que sube)
        float scanline = step(0.95, mod(vUv.y - uTime * 0.5, 1.0));
        
        // 3. Bordes brillantes (Outline effect)
        float borderX = step(0.95, vUv.x) + step(vUv.x, 0.05);
        float borderY = step(0.98, vUv.y); // Solo borde arriba
        float border = max(borderX, borderY);

        // Mezcla de colores
        vec3 glowColor = uColor + vec3(0.5); // Color más blanco para el brillo
        vec3 finalColor = mix(uColor, glowColor, scanline + border);

        // Alpha final: Gradiente base + bordes siempre visibles
        float finalAlpha = opacity * 0.6 + border * 0.4 + scanline * 0.3;

        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

// --- THREE.JS VARIABLES ---
const canvasContainer = ref(null);
let scene, camera, renderer, labelRenderer, animationId;
let bars = [];
let targetBarHeights = [];
// Variable reactiva para el color actual en el shader
let uniformColor = { value: dashboardData.overview.color }; 

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); // Negro casi puro para resaltar neón
    // Eliminamos niebla para que se vea nítido "2D"

    // 2. Camera (Frontal, casi ortográfica en sensación)
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 5, 25);
    camera.lookAt(0, 2.5, 0);

    // 3. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // No necesitamos shadowMap porque usaremos un estilo "Unlit" (sin luz)
    
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';
    canvasContainer.value.appendChild(renderer.domElement);

    // 4. CSS2D Renderer
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '2';
    canvasContainer.value.appendChild(labelRenderer.domElement);

    // 5. Suelo Grid (Personalizado para ser sutil)
    const gridHelper = new THREE.GridHelper(50, 50, 0x333333, 0x111111);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 6. BARRAS CON SHADER
    // Usamos PlaneGeometry para que sea "plano" (2D) pero en espacio 3D, 
    // o BoxGeometry delgado. Usaremos Box para mantener algo de volumen al rotar.
    const geometry = new THREE.BoxGeometry(1, 1, 0.2); 
    geometry.translate(0, 0.5, 0); // Pivote en la base

    // Material Personalizado
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uColor: uniformColor,
            uTime: { value: 0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending, // Clave para el look holográfico
        depthWrite: false // Ayuda a la transparencia
    });

    const initialData = dashboardData.overview.chartData;
    targetBarHeights = [...initialData];

    for (let i = 0; i < 12; i++) {
        const bar = new THREE.Mesh(geometry, shaderMaterial.clone());
        // Clonamos material para que cada uno tenga sus propios uniforms si quisieramos variarlos, 
        // pero aquí compartimos uniforms globales para performance, EXCEPTO si quisieramos desfase de tiempo.
        // Para simplificar, usaremos el mismo material base pero Three.js maneja las instancias.
        // Nota: Si queremos cambiar color globalmente, mejor usar un objeto uniform compartido.
        
        // Espaciado
        bar.position.x = (i - 5.5) * 1.5;
        bar.position.z = 0;
        
        // Inicio escala 0
        bar.scale.y = 0.01;

        // ETIQUETAS CSS
        const div = document.createElement('div');
        div.className = 'chart-label';
        div.textContent = initialData[i];
        
        const label = new CSS2DObject(div);
        label.position.set(0, 1.1, 0); // Justo encima
        bar.add(label);

        scene.add(bar);
        bars.push(bar);
    }

    // NO HAY LUCES. Los Shaders brillan por sí mismos.

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Actualizar Uniforms globales
        bars.forEach((bar, i) => {
            // Actualizar tiempo en el shader para el efecto scanline
            bar.material.uniforms.uTime.value = time;
            
            // Lerp de Altura (Igual que antes)
            const target = targetBarHeights[i] || 0.1;
            bar.scale.y += (target - bar.scale.y) * 0.1;
            
            // Efecto flotante en la etiqueta (no en la barra)
            bar.children[0].position.y = 1.1 + Math.sin(time * 3 + i) * 0.05;
        });

        // Movimiento de cámara muy sutil estilo "Parallax UI"
        // No rotamos, solo movemos en X/Y plano
        camera.position.x = Math.sin(time * 0.2) * 1;
        camera.position.y = 5 + Math.cos(time * 0.2) * 0.5;
        camera.lookAt(0, 2.5, 0);

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    };

    animate();
};

const switchTab = (tabName) => {
    activeTab.value = tabName;
    const data = dashboardData[tabName];
    targetBarHeights = data.chartData;

    // Animación de color suave usando GSAP o manual
    // Aquí hacemos un cambio directo al objeto de color que referencia el shader
    // Para hacerlo suave con Three.js lerp:
    const targetC = data.color;
    
    // Como compartimos lógica, vamos a animar esto en el loop o forzar actualización
    bars.forEach((bar, i) => {
        // Reset visual 'glitch'
        bar.scale.y = 0.1; 
        // Actualizar etiqueta
        const labelDiv = bar.children[0].element;
        labelDiv.textContent = data.chartData[i];
        
        // Asignar el nuevo color al uniform
        bar.material.uniforms.uColor.value = targetC;
    });
};

const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
};

onMounted(() => {
    init();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationId);
    if(renderer) renderer.dispose();
});
</script>

<template>
    <div class="dashboard-layout">
        
        <aside class="sidebar">
            <div class="logo-area">
                <div class="logo-icon">C</div>
                <span>CodingLab</span>
            </div>

            <nav class="menu">
                <div 
                    class="menu-item" 
                    :class="{ active: activeTab === 'overview' }"
                    @click="switchTab('overview')"
                >
                    <n-icon size="20"><DashboardIcon /></n-icon>
                    <span>Overview</span>
                </div>
                <div 
                    class="menu-item" 
                    :class="{ active: activeTab === 'analytics' }"
                    @click="switchTab('analytics')"
                >
                    <n-icon size="20"><AnalyticsIcon /></n-icon>
                    <span>Analytics</span>
                </div>
                <div 
                    class="menu-item" 
                    :class="{ active: activeTab === 'reports' }"
                    @click="switchTab('reports')"
                >
                    <n-icon size="20"><ReportsIcon /></n-icon>
                    <span>Reports</span>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-item">
                    <n-icon size="20"><SettingsIcon /></n-icon>
                    <span>Settings</span>
                </div>
            </nav>
        </aside>

        <main class="main-content">
            <header class="top-bar">
                <div class="menu-toggle">☰</div>
                <h2>{{ dashboardData[activeTab].title }}</h2>
                <div class="profile-pic"></div>
            </header>

            <div ref="canvasContainer" class="canvas-wrapper"></div>

            <div class="stats-overlay">
                <div class="stat-card" :style="{ borderColor: dashboardData[activeTab].accent, boxShadow: `0 0 15px ${dashboardData[activeTab].accent}40` }">
                    <div class="stat-title">Total Revenue</div>
                    <div class="stat-value">{{ dashboardData[activeTab].kpis.revenue }}</div>
                    <div class="stat-trend up">
                        ▲ {{ dashboardData[activeTab].kpis.growth }} 
                        <span class="sub">vs last month</span>
                    </div>
                </div>

                <div class="stat-card" :style="{ borderColor: dashboardData[activeTab].accent, boxShadow: `0 0 15px ${dashboardData[activeTab].accent}40` }">
                    <div class="stat-title">Net Profit</div>
                    <div class="stat-value">{{ dashboardData[activeTab].kpis.profit }}</div>
                    <div class="stat-trend">
                        <span class="sub">Projection matched</span>
                    </div>
                </div>

                <div class="stat-card glass">
                    <div class="stat-title">System Health</div>
                    <div class="health-bar">
                        <div class="fill" :style="{ background: dashboardData[activeTab].accent, boxShadow: `0 0 10px ${dashboardData[activeTab].accent}` }"></div>
                    </div>
                    <div class="stat-sub">Optimal Performance</div>
                </div>
            </div>
        </main>
    </div>
</template>

<style>
/* ETIQUETAS FLOTANTES MEJORADAS */
.chart-label {
    color: #fff;
    font-family: 'Courier New', monospace; /* Fuente más técnica/hacker */
    font-weight: bold;
    font-size: 14px;
    /* Quitamos el fondo negro para que parezca flotar en el holograma */
    text-shadow: 0 0 5px rgba(0,0,0,1), 0 0 10px currentColor;
    pointer-events: none;
    letter-spacing: 1px;
}
</style>

<style scoped>
.dashboard-layout {
    display: flex;
    width: 100vw;
    height: 100vh;
    background: #050505; /* Fondo negro profundo */
    color: white;
    font-family: 'Poppins', sans-serif;
    overflow: hidden;
}

.sidebar {
    width: 250px;
    background: rgba(17, 16, 29, 0.8); /* Semi transparente */
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    padding: 20px 10px;
    z-index: 20; 
    border-right: 1px solid rgba(255,255,255,0.05);
}

.logo-area {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 40px;
    padding-left: 10px;
    font-size: 1.2rem;
    font-weight: 600;
}
.logo-icon {
    width: 30px;
    height: 30px;
    background: #00f2ff;
    color: black;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    box-shadow: 0 0 10px #00f2ff;
}

.menu {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px 15px;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
}

.menu-item:hover {
    background: rgba(255,255,255,0.05);
    color: white;
}

.menu-item.active {
    background: rgba(0, 242, 255, 0.1); 
    color: #00f2ff;
    border-left: 3px solid #00f2ff;
}

.menu-divider {
    height: 1px;
    background: rgba(255,255,255,0.1);
    margin: 20px 0;
}

.main-content {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at center, #1a1a2e 0%, #000000 100%); /* Vignette background */
}

.top-bar {
    height: 60px;
    background: transparent; 
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 10;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.menu-toggle { font-size: 1.5rem; cursor: pointer; }
.profile-pic { width: 35px; height: 35px; background: #333; border: 1px solid #555; border-radius: 50%; }

.canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.stats-overlay {
    position: absolute;
    top: 20px;
    left: 30px;
    right: 30px;
    display: flex;
    gap: 20px;
    pointer-events: none; 
}

.stat-card {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    padding: 20px;
    border-radius: 8px;
    width: 200px;
    border: 1px solid rgba(255,255,255,0.1);
    /* Border top dinámico removido, ahora usamos border completo + glow en inline styles */
    transition: all 0.3s ease;
}

.stat-title {
    font-size: 0.75rem;
    color: #aaa;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.stat-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 5px;
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
}

.stat-trend {
    font-size: 0.8rem;
    color: #00ff88; 
    font-weight: 600;
}
.stat-trend .sub {
    color: #666;
    font-weight: 400;
}

.health-bar {
    width: 100%;
    height: 4px;
    background: #333;
    border-radius: 2px;
    margin: 10px 0;
    overflow: hidden;
}
.fill {
    width: 85%;
    height: 100%;
    /* Background dinámico en inline style */
}
</style>