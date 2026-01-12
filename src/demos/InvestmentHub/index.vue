<script setup>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { onMounted, onUnmounted, reactive, ref } from 'vue';

import {
    BusinessOutline,
    PeopleOutline
} from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';

// --- VUE STATE ---
const totalInvestment = ref(1150000000);
const staffCount = ref(500);
const industriesCount = ref(30);

// Datos simulados para las tablas y gráficas
const companies = reactive([
    { name: 'Nebula Corp', amount: '1.2M', time: '2025.01', manager: 'Stan' },
    { name: 'Orion Systems', amount: '3.5M', time: '2025.02', manager: 'Martin' },
    { name: 'Void Energy', amount: '8.1M', time: '2025.03', manager: 'Leo' },
    { name: 'Quantum AI', amount: '2.0M', time: '2025.04', manager: 'Sherry' }
]);

// --- THREE.JS VARIABLES ---
const canvasContainer = ref(null);
let scene, camera, renderer, composer, labelRenderer, controls, animationId;
let ringsGroup, starsSystem;

// --- INIT THREE.JS ---
const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Escena "Espacio Profundo"
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a); // Azul muy oscuro
    scene.fog = new THREE.FogExp2(0x02040a, 0.02);

    // 2. Cámara
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 25); // Ángulo frontal ligeramente elevado

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.value.appendChild(renderer.domElement);

    // 4. Etiquetas HTML (CSS2D)
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    canvasContainer.value.appendChild(labelRenderer.domElement);

    // 5. Bloom (Resplandor intenso para el efecto holograma)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.strength = 2.0; // Muy brillante
    bloomPass.radius = 0.8;
    bloomPass.threshold = 0.1;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = false; // Bloquear zoom para mantener el diseño UI

    // --- OBJETOS ---
    createStarField();
    createHoloCore();

    // Luces
    const ambientLight = new THREE.AmbientLight(0x4040ff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00ffff, 2, 50);
    pointLight.position.set(0, 10, 10);
    scene.add(pointLight);

    animate();
};

const createStarField = () => {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for(let i=0; i<2000; i++) {
        positions.push((Math.random() - 0.5) * 100);
        positions.push((Math.random() - 0.5) * 100);
        positions.push((Math.random() - 0.5) * 100);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 });
    starsSystem = new THREE.Points(geometry, material);
    scene.add(starsSystem);
};

const createHoloCore = () => {
    ringsGroup = new THREE.Group();
    
    // Anillo Exterior
    const ring1Geo = new THREE.TorusGeometry(6, 0.05, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ringsGroup.add(ring1);

    // Anillo Medio (Inclinado)
    const ring2Geo = new THREE.TorusGeometry(4.5, 0.08, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x0088ff });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    ringsGroup.add(ring2);

    // Núcleo Central (Esfera Wireframe)
    const coreGeo = new THREE.IcosahedronGeometry(2, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
    const core = new THREE.Mesh(coreGeo, coreMat);
    ringsGroup.add(core);

    // Etiquetas flotantes 3D (Simulando los datos flotantes de la imagen)
    const labelsData = [
        { text: 'ICS30001 [01]', y: 3 },
        { text: 'ICF30003 [05]', y: -3 },
        { text: 'Market Cap', y: 0, x: 5 }
    ];

    labelsData.forEach(d => {
        const div = document.createElement('div');
        div.className = 'holo-label';
        div.textContent = d.text;
        const label = new CSS2DObject(div);
        label.position.set(d.x || 0, d.y, 0);
        ringsGroup.add(label);
    });

    scene.add(ringsGroup);
};

const animate = () => {
    animationId = requestAnimationFrame(animate);
    controls.update();

    // Animaciones
    if (ringsGroup) {
        ringsGroup.children[0].rotation.z += 0.002; // Anillo exterior
        ringsGroup.children[1].rotation.y -= 0.005; // Anillo medio
        ringsGroup.children[2].rotation.x += 0.01;  // Núcleo
        ringsGroup.children[2].rotation.y += 0.01;
    }
    
    if (starsSystem) {
        starsSystem.rotation.y += 0.0002;
    }

    // Actualizar número aleatoriamente para simular tiempo real
    if(Math.random() > 0.95) totalInvestment.value += Math.floor(Math.random() * 1000);

    composer.render();
    labelRenderer.render(scene, camera);
};

const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
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
    <div class="space-dashboard">
        
        <header class="main-header">
            <div class="header-top">
                <div class="tag-box">
                    <n-icon color="#00ffff"><PeopleOutline/></n-icon>
                    <span>{{ staffCount }}+ Staff</span>
                </div>
                <div class="title-glow">
                    <h2>2026 TOTAL INVESTMENT AMOUNT</h2>
                    <h1 class="big-number">${{ totalInvestment.toLocaleString() }}</h1>
                </div>
                <div class="tag-box">
                    <n-icon color="#ffd700"><BusinessOutline/></n-icon>
                    <span>{{ industriesCount }}+ Industries</span>
                </div>
            </div>
        </header>

        <div ref="canvasContainer" class="canvas-layer"></div>

        <div class="ui-grid">
            
            <div class="panel left-top">
                <h3>Project Screening Funnel</h3>
                <div class="funnel-chart">
                    <div class="f-layer l1">Hardworking</div>
                    <div class="f-layer l2">Responsibilities</div>
                    <div class="f-layer l3">Environment</div>
                    <div class="f-layer l4">Professional</div>
                    <div class="f-layer l5">Smart</div>
                </div>
            </div>

            <div class="panel left-bottom">
                <h3>Investment Records</h3>
                <table class="data-table">
                    <thead>
                        <tr><th>Company</th><th>Amount</th><th>Name</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(c, i) in companies" :key="i">
                            <td>{{ c.name }}</td>
                            <td class="accent">{{ c.amount }}</td>
                            <td>{{ c.manager }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="spacer-center"></div>

            <div class="panel right-top">
                <h3>Risk Control Capability</h3>
                <div class="radar-sim">
                    <div class="radar-circle"></div>
                    <div class="radar-cross"></div>
                    <div class="radar-poly"></div>
                    <span class="lbl t">Profitability</span>
                    <span class="lbl r">Persistence</span>
                    <span class="lbl b">Risk Control</span>
                    <span class="lbl l">Market Timing</span>
                </div>
            </div>

            <div class="panel right-bottom">
                <h3>Regional Distribution</h3>
                <div class="bar-chart-sim">
                    <div class="bar-group" v-for="h in [40, 70, 50, 90, 60]" :key="h">
                        <div class="bar-fill" :style="{height: h + '%'}"></div>
                        <span class="bar-lbl">Zone</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="bottom-bar">
             <div class="donut-sim">
                 <div class="circle c1"></div>
                 <span>Education</span>
             </div>
             <div class="donut-sim">
                 <div class="circle c2"></div>
                 <span>Retail</span>
             </div>
        </div>

    </div>
</template>

<style>
/* Estilo para las etiquetas flotantes dentro del canvas */
.holo-label {
    color: #00ffff;
    font-family: 'Courier New', monospace;
    background: rgba(0, 20, 40, 0.7);
    border: 1px solid #00ffff;
    padding: 2px 5px;
    font-size: 10px;
    box-shadow: 0 0 10px #00ffff;
}
</style>

<style scoped>
.space-dashboard {
    width: 100vw;
    height: 100vh;
    background: #02040a;
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    position: relative;
}

.canvas-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0; /* Detrás de la UI */
}

/* HEADER */
.main-header {
    position: absolute;
    top: 0;
    width: 100%;
    height: 120px;
    z-index: 10;
    background: linear-gradient(180deg, rgba(0,10,30,0.9) 0%, transparent 100%);
    display: flex;
    justify-content: center;
    padding-top: 20px;
}
.header-top { display: flex; align-items: flex-start; gap: 50px; }
.title-glow { text-align: center; }
.title-glow h2 { color: #00ffff; font-size: 1.2rem; margin: 0; letter-spacing: 2px; text-shadow: 0 0 10px #00ffff; }
.big-number { font-size: 3.5rem; margin: 0; font-family: 'Courier New', monospace; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
.tag-box { 
    border: 1px solid #004488; 
    padding: 5px 15px; 
    background: rgba(0,0,0,0.5); 
    display: flex; 
    align-items: center; 
    gap: 8px;
    box-shadow: 0 0 15px rgba(0, 100, 255, 0.2) inset;
}

/* GRID LAYOUT */
.ui-grid {
    position: absolute;
    top: 120px;
    bottom: 80px;
    left: 20px;
    right: 20px;
    z-index: 5;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
    pointer-events: none; /* Dejar pasar clicks al canvas central si es necesario */
}

/* PANELES COMUNES */
.panel {
    background: rgba(0, 15, 30, 0.4);
    border: 1px solid rgba(0, 100, 255, 0.3);
    box-shadow: 0 0 20px rgba(0, 100, 255, 0.1) inset;
    backdrop-filter: blur(2px);
    padding: 15px;
    display: flex;
    flex-direction: column;
    position: relative;
    pointer-events: auto;
}
.panel::before { /* Decoración esquinas */
    content: ''; position: absolute; top: -1px; left: -1px; width: 10px; height: 10px; 
    border-top: 2px solid #00ffff; border-left: 2px solid #00ffff;
}
.panel::after {
    content: ''; position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; 
    border-bottom: 2px solid #00ffff; border-right: 2px solid #00ffff;
}

.panel h3 { margin: 0 0 10px 0; color: #ffd700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }

/* FUNNEL (CSS puro) */
.funnel-chart { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 2px; }
.f-layer { width: 80%; text-align: center; color: #fff; font-size: 0.7rem; padding: 4px 0; clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%); }
.l1 { width: 100%; background: rgba(0, 100, 255, 0.8); }
.l2 { width: 85%; background: rgba(0, 140, 255, 0.8); }
.l3 { width: 70%; background: rgba(0, 180, 255, 0.8); }
.l4 { width: 55%; background: rgba(0, 220, 255, 0.8); }
.l5 { width: 40%; background: rgba(255, 200, 0, 0.8); clip-path: polygon(0 0, 100% 0, 50% 100%, 50% 100%); }

/* DATA TABLE */
.data-table { width: 100%; font-size: 0.8rem; border-collapse: collapse; }
.data-table th { color: #00ffff; text-align: left; border-bottom: 1px solid #333; padding: 5px; }
.data-table td { padding: 8px 5px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.accent { color: #ffd700; font-weight: bold; }

/* RADAR SIMULATION */
.radar-sim { position: relative; height: 100%; display: flex; align-items: center; justify-content: center; }
.radar-circle { width: 100px; height: 100px; border: 1px dashed #004488; border-radius: 50%; position: absolute; }
.radar-poly { width: 60px; height: 60px; background: rgba(0, 255, 255, 0.2); border: 1px solid #00ffff; transform: rotate(45deg); }
.lbl { position: absolute; font-size: 0.6rem; color: #aaa; }
.t { top: 10px; } .b { bottom: 10px; } .l { left: 10px; } .r { right: 10px; }

/* BAR CHART SIM */
.bar-chart-sim { display: flex; justify-content: space-around; align-items: flex-end; height: 100%; padding-bottom: 10px; }
.bar-group { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; width: 15%; }
.bar-fill { width: 100%; background: linear-gradient(0deg, #004488 0%, #00ffff 100%); transition: height 1s; }
.bar-lbl { font-size: 0.6rem; margin-top: 5px; color: #888; }

/* BOTTOM BAR */
.bottom-bar {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 70px;
    display: flex;
    justify-content: center;
    gap: 50px;
    z-index: 10;
    padding-top: 10px;
    background: linear-gradient(0deg, rgba(0,10,30,0.9) 0%, transparent 100%);
}
.donut-sim { display: flex; align-items: center; gap: 10px; font-weight: bold; }
.circle { width: 30px; height: 30px; border-radius: 50%; border: 4px solid #333; }
.c1 { border-top-color: #00ffff; border-right-color: #00ffff; }
.c2 { border-top-color: #ff00ff; border-left-color: #ff00ff; }

</style>