<script setup>
import * as THREE from 'three';
import { computed, onMounted, onUnmounted, ref } from 'vue';

// --- VUE STATE (DATOS FAKE) ---
const serverLoad = ref(0);
const activeUsers = ref(1420);
const threats = ref(0);
const systemStatus = computed(() => serverLoad.value > 80 ? 'CRITICAL' : 'OPTIMAL');
const statusColor = computed(() => serverLoad.value > 80 ? '#ff0055' : '#00ff88');

// Referencias 3D
const canvasContainer = ref(null);
let scene, camera, renderer, animationId;
let bars = []; // Array para guardar las referencias a las barras 3D
let globe, rings = [];

// Configuración
const BAR_COUNT = 32;
const RADIUS = 8;

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510); // Azul muy oscuro
    scene.fog = new THREE.FogExp2(0x050510, 0.02);

    // Cámara isométrica para dar sensación de estrategia
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Fix para posición absoluta
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    
    canvasContainer.value.appendChild(renderer.domElement);

    // 2. EL GLOBO CENTRAL (Wireframe)
    const geometry = new THREE.IcosahedronGeometry(4, 2);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.3 
    });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Núcleo sólido interno para bloquear luz
    const coreGeo = new THREE.IcosahedronGeometry(3.8, 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    globe.add(core);

    // 3. ANILLOS ORBITALES (UI Decorativa)
    const ringGeo1 = new THREE.TorusGeometry(12, 0.1, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.5 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);
    rings.push(ring1);

    const ringGeo2 = new THREE.TorusGeometry(10, 0.05, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.3 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.y = 0.5;
    scene.add(ring2);
    rings.push(ring2);

    // 4. GRÁFICAS DE BARRAS CIRCULARES
    // Creamos 32 barras alrededor del planeta
    const barGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    // Movemos el pivote de la geometría a la base para que crezca hacia arriba
    barGeometry.translate(0, 0.5, 0); 

    const barMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ff88,
        emissive: 0x004422,
        flatShading: true
    });

    for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2;
        const mesh = new THREE.Mesh(barGeometry, barMaterial.clone()); // Material clonado para cambiar color individualmente
        
        // Posición en círculo
        mesh.position.x = Math.cos(angle) * RADIUS;
        mesh.position.z = Math.sin(angle) * RADIUS;
        mesh.position.y = -2; // Un poco abajo

        // Rotar para que mire al centro
        mesh.lookAt(0, mesh.position.y, 0);
        
        // Guardamos datos para animación
        mesh.userData = {
            angle: angle,
            speed: 0.5 + Math.random() * 2 // Velocidad de oscilación única
        };

        scene.add(mesh);
        bars.push(mesh);
    }

    // 5. Grid del Suelo (Tron Style)
    const gridHelper = new THREE.GridHelper(60, 60, 0x111111, 0x111111);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // 6. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00aaff, 2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // A. Rotar Globo y Anillos
        globe.rotation.y = time * 0.1;
        globe.rotation.z = Math.sin(time * 0.2) * 0.1;

        rings[0].rotation.z = time * 0.05;
        rings[1].rotation.z = -time * 0.1;
        rings[1].rotation.x = (Math.PI / 2) + Math.sin(time) * 0.1; // "Wobble" effect

        // B. Animar Barras (Visualización de Datos)
        let totalHeight = 0;
        
        bars.forEach((bar, index) => {
            // Fórmula matemática para simular tráfico orgánico
            // Base sine wave + ruido rápido
            const height = 1 + Math.sin(time * bar.userData.speed + index) * 2 + Math.cos(time * 5) * 0.5;
            
            // Limitamos altura mínima y máxima
            const scaleY = Math.max(0.2, Math.abs(height) * 3);
            
            // Interpolación suave hacia la nueva escala
            bar.scale.y += (scaleY - bar.scale.y) * 0.1;

            // COLOR REACTIVO: Si la barra es muy alta (tráfico alto), se pone roja
            const colorTarget = scaleY > 5 ? new THREE.Color(0xff0055) : new THREE.Color(0x00ff88);
            bar.material.color.lerp(colorTarget, 0.1);
            bar.material.emissive.lerp(colorTarget, 0.1);

            totalHeight += scaleY;
        });

        // C. Actualizar Datos Fake de Vue basados en el estado del 3D
        // Esto conecta el mundo visual con el numérico
        if (Math.random() > 0.9) { // Solo actualizar a veces para que no parpadee loco
            serverLoad.value = Math.min(100, Math.floor((totalHeight / (BAR_COUNT * 6)) * 100));
            activeUsers.value = 1400 + Math.floor(Math.sin(time) * 200 + Math.random() * 50);
            threats.value = serverLoad.value > 80 ? Math.floor(Math.random() * 5) : 0;
        }

        // Cámara flotante lenta
        camera.position.x = 20 + Math.sin(time * 0.2) * 2;
        camera.position.z = 20 + Math.cos(time * 0.2) * 2;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    };

    animate();
};

const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
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
    <div ref="canvasContainer" class="scene-container">
        
        <div class="dashboard-ui">
            <div class="ui-header">
                <h1>GLOBAL TRAFFIC MONITOR</h1>
                <div class="live-indicator">
                    <div class="dot"></div> LIVE
                </div>
            </div>

            <div class="panel left-panel">
                <div class="stat-card">
                    <label>SERVER LOAD</label>
                    <div class="value" :style="{ color: statusColor }">
                        {{ serverLoad }}%
                    </div>
                    <div class="bar-bg">
                        <div class="bar-fill" :style="{ width: serverLoad + '%', background: statusColor }"></div>
                    </div>
                </div>

                <div class="stat-card">
                    <label>ACTIVE SESSIONS</label>
                    <div class="value white">{{ activeUsers }}</div>
                </div>

                 <div class="stat-card">
                    <label>THREATS DETECTED</label>
                    <div class="value red">{{ threats }}</div>
                </div>
            </div>

            <div class="panel right-panel">
                <div class="status-box" :class="{ critical: serverLoad > 80 }">
                    <label>SYSTEM STATUS</label>
                    <div class="status-text">{{ systemStatus }}</div>
                </div>
                <div class="log-box">
                    <p>> Initializing geo-mesh...</p>
                    <p>> Connecting to nodes...</p>
                    <p>> Data stream stable.</p>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.scene-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #050510;
    overflow: hidden;
    font-family: 'Courier New', Courier, monospace; /* Fuente Monospace es clave para look Dashboard */
}

/* UI OVERLAY ESTILOS */
.dashboard-ui {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Permite clicks en el canvas si fuera necesario */
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.ui-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 170, 255, 0.3);
    padding-bottom: 10px;
    background: linear-gradient(90deg, rgba(0,0,0,0), rgba(0, 170, 255, 0.1), rgba(0,0,0,0));
}

h1 {
    color: #00aaff;
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: 4px;
    text-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
}

.live-indicator {
    color: #00ff88;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
}

.dot {
    width: 10px;
    height: 10px;
    background: #00ff88;
    border-radius: 50%;
    box-shadow: 0 0 10px #00ff88;
    animation: blink 1s infinite;
}

.panel {
    position: absolute;
    top: 100px;
    width: 250px;
}

.left-panel { left: 30px; }
.right-panel { right: 30px; text-align: right; }

.stat-card {
    background: rgba(0, 20, 40, 0.6);
    border-left: 2px solid #00aaff;
    padding: 15px;
    margin-bottom: 20px;
    backdrop-filter: blur(4px);
}

.stat-card label {
    display: block;
    color: #00aaff;
    font-size: 0.8rem;
    margin-bottom: 5px;
    opacity: 0.8;
}

.stat-card .value {
    font-size: 2rem;
    font-weight: bold;
    text-shadow: 0 0 10px currentColor;
}

.white { color: white; }
.red { color: #ff0055; text-shadow: 0 0 15px #ff0055; }

.bar-bg {
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.1);
    margin-top: 5px;
}

.bar-fill {
    height: 100%;
    transition: width 0.5s ease, background 0.5s ease;
}

.status-box {
    border: 1px solid #00ff88;
    padding: 15px;
    color: #00ff88;
    margin-bottom: 20px;
}

.status-box.critical {
    border-color: #ff0055;
    color: #ff0055;
    animation: shake 0.5s infinite;
}

.status-text {
    font-size: 1.5rem;
    font-weight: bold;
}

.log-box {
    color: rgba(0, 170, 255, 0.5);
    font-size: 0.7rem;
    line-height: 1.5;
}

@keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
}

@keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
}
</style>