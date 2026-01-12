<script setup>
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { onMounted, onUnmounted, reactive, ref } from 'vue';

// Iconos UI
import {
    CarSportOutline, CubeOutline, MapOutline
} from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';

// --- ESTADO DE LA SIMULACIÓN (VUE) ---
const financials = reactive({
    revenue: 124500,
    expenses: 45000,
    deliveriesToday: 142
});

const fleetStats = reactive({
    transit: 0,
    delivering: 0,
    idle: 0,
    total: 30
});

const warehouses = reactive([
    { id: 'W-A', name: 'Alpha Hub', stock: 4500, max: 5000, color: '#00ff88' },
    { id: 'W-B', name: 'Beta Hub', stock: 2300, max: 5000, color: '#00aaff' },
    { id: 'W-C', name: 'Gamma Hub', stock: 1200, max: 5000, color: '#ffaa00' }
]);

const recentLogs = ref([]);

const addLog = (msg, type = 'info') => {
    recentLogs.value.unshift({ time: new Date().toLocaleTimeString(), msg, type });
    if (recentLogs.value.length > 6) recentLogs.value.pop();
};

// --- THREE.JS VARIABLES ---
const canvasContainer = ref(null);
let scene, camera, renderer, labelRenderer, composer, animationId;
let cityGroup, carSystem = [];
const CITY_SIZE = 60;
const HALF_CITY = CITY_SIZE / 2;

// --- INICIALIZACIÓN ---
const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.015);

    // 2. Camera (Vista aérea isométrica)
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(40, 40, 40);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.value.appendChild(renderer.domElement);

    // 4. CSS2D Renderer (Etiquetas)
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    canvasContainer.value.appendChild(labelRenderer.domElement);

    // 5. Post-Processing (Bloom)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.2; // Mucho brillo neon
    bloomPass.radius = 0.5;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- CONSTRUCCIÓN DEL MUNDO ---
    buildCityGrid();
    spawnWarehouses();
    spawnFleet();

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    animate();
};

// Genera una cuadrícula de edificios y calles
const buildCityGrid = () => {
    cityGroup = new THREE.Group();
    
    // Suelo Grid
    const gridHelper = new THREE.GridHelper(CITY_SIZE, 20, 0x222222, 0x111111);
    cityGroup.add(gridHelper);

    // Edificios (Cajas simples con bordes brillantes)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x001133 });
    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.3 });

    for (let i = 0; i < 80; i++) {
        // Posición aleatoria alineada al grid
        const x = Math.floor((Math.random() - 0.5) * CITY_SIZE);
        const z = Math.floor((Math.random() - 0.5) * CITY_SIZE);
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Dejar centro libre

        const h = Math.random() * 4 + 1; // Altura aleatoria
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, h/2, z);
        mesh.scale.set(1.8, h, 1.8); // Bloques de edificios
        
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        edges.position.copy(mesh.position);
        edges.scale.copy(mesh.scale);

        cityGroup.add(mesh);
        cityGroup.add(edges);
    }
    scene.add(cityGroup);
};

// Crea las 3 bodegas principales
const spawnWarehouses = () => {
    const geo = new THREE.CylinderGeometry(0, 1.5, 4, 4);
    
    warehouses.forEach((w, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: w.color, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Posicionar en triángulo alrededor del centro
        const angle = (i / 3) * Math.PI * 2;
        const dist = 15;
        mesh.position.set(Math.cos(angle) * dist, 2, Math.sin(angle) * dist);
        
        // Luz baliza
        const light = new THREE.PointLight(w.color, 2, 10);
        light.position.set(0, 2, 0);
        mesh.add(light);

        // Etiqueta HTML
        const div = document.createElement('div');
        div.className = 'warehouse-label';
        div.innerHTML = `<strong>${w.name}</strong><br><span id="stock-${i}">${w.stock}</span> units`;
        div.style.color = w.color;
        
        const label = new CSS2DObject(div);
        label.position.set(0, 3, 0);
        mesh.add(label);

        // Guardamos referencia 3D en el objeto reactivo para usarla luego
        w.position = mesh.position.clone();
        scene.add(mesh);
    });
};

// Crea los autos (Conos)
const spawnFleet = () => {
    const geometry = new THREE.ConeGeometry(0.3, 1, 3);
    geometry.rotateX(Math.PI / 2); // Apuntar hacia adelante

    for (let i = 0; i < fleetStats.total; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const car = new THREE.Mesh(geometry, material);
        
        // Estado inicial del auto
        const carData = {
            mesh: car,
            state: 'IDLE', // IDLE, TRANSIT, DELIVERING
            target: new THREE.Vector3(),
            speed: 0.05 + Math.random() * 0.1,
            homeBase: warehouses[i % 3], // Asignado a una bodega
            waitTimer: 0
        };
        
        // Iniciar en su base
        car.position.copy(carData.homeBase.position);
        
        scene.add(car);
        carSystem.push(carData);
        pickNewMission(carData); // Asignar primera misión
    }
};

// LÓGICA DE SIMULACIÓN (IA de los autos)
const pickNewMission = (car) => {
    // 1. Elegir un destino aleatorio en la ciudad
    const x = Math.floor((Math.random() - 0.5) * CITY_SIZE);
    const z = Math.floor((Math.random() - 0.5) * CITY_SIZE);
    
    car.target.set(x, 0.5, z);
    car.mesh.lookAt(car.target);
    
    car.state = 'TRANSIT';
    car.mesh.material.color.setHex(0x00ff88); // Verde = Moviéndose
};

const updateFleet = (deltaTime) => {
    let transit = 0;
    let delivering = 0;
    let idle = 0;

    carSystem.forEach(car => {
        if (car.state === 'TRANSIT') {
            transit++;
            
            // Mover hacia el objetivo
            const dir = new THREE.Vector3().subVectors(car.target, car.mesh.position).normalize();
            car.mesh.position.add(dir.multiplyScalar(car.speed));

            // Checar si llegó
            if (car.mesh.position.distanceTo(car.target) < 1) {
                car.state = 'DELIVERING';
                car.waitTimer = 100 + Math.random() * 100; // Tiempo de espera simulado
                car.mesh.material.color.setHex(0xffaa00); // Naranja = Entregando
                
                // EVENTO DE NEGOCIO: Venta realizada
                financials.revenue += 120;
                financials.deliveriesToday++;
                
                // Reducir stock de su bodega
                if (car.homeBase.stock > 0) {
                    car.homeBase.stock -= 10;
                    // Actualizar etiqueta DOM (hack rápido)
                    const el = document.getElementById(`stock-${warehouses.indexOf(car.homeBase)}`);
                    if(el) el.innerText = car.homeBase.stock;
                } else {
                    addLog(`${car.homeBase.name} OUT OF STOCK!`, 'error');
                }
            }
        } 
        else if (car.state === 'DELIVERING') {
            delivering++;
            car.waitTimer--;
            
            // Animación sutil de "trabajando"
            car.mesh.rotation.y += 0.1;

            if (car.waitTimer <= 0) {
                // Misión completa, volver a base o nueva misión
                if (Math.random() > 0.3) {
                    pickNewMission(car);
                    addLog(`Unit reached destination. New route set.`, 'success');
                } else {
                    car.state = 'IDLE';
                    car.target.copy(car.homeBase.position); // Volver a casa
                    car.mesh.lookAt(car.target);
                    car.mesh.material.color.setHex(0x00aaff); // Azul = Regresando
                }
            }
        }
        else if (car.state === 'IDLE') {
            idle++;
            // Regresando a base
            const dir = new THREE.Vector3().subVectors(car.target, car.mesh.position).normalize();
            car.mesh.position.add(dir.multiplyScalar(car.speed));

            if (car.mesh.position.distanceTo(car.target) < 1) {
                // Llegó a base, recargar stock
                car.homeBase.stock += 50; 
                financials.expenses += 500; // Gasto de restock
                pickNewMission(car);
            }
        }
    });

    // Actualizar UI Vue
    fleetStats.transit = transit;
    fleetStats.delivering = delivering;
    fleetStats.idle = idle;
};

const animate = () => {
    animationId = requestAnimationFrame(animate);
    
    // Rotar ciudad lentamente
    if(scene) scene.rotation.y += 0.001;
    
    updateFleet();
    
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
    labelRenderer.setSize(width, height);
    composer.setSize(width, height);
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
    <div class="logistics-container">
        <header class="top-header">
            <div class="brand">
                <n-icon size="24" color="#00ff88"><MapOutline /></n-icon>
                <span>FLEET COMMAND v4.0</span>
            </div>
            <div class="global-stats">
                <div class="stat">
                    <span class="label">REVENUE</span>
                    <span class="val success">${{ financials.revenue.toLocaleString() }}</span>
                </div>
                <div class="stat">
                    <span class="label">EXPENSES</span>
                    <span class="val danger">${{ financials.expenses.toLocaleString() }}</span>
                </div>
                <div class="stat">
                    <span class="label">DELIVERIES</span>
                    <span class="val">{{ financials.deliveriesToday }}</span>
                </div>
            </div>
        </header>

        <div ref="canvasContainer" class="viewport-3d"></div>

        <aside class="panel left-panel">
            <h3>FLEET STATUS</h3>
            
            <div class="fleet-meter">
                <div class="meter-row">
                    <span class="label">IN TRANSIT</span>
                    <div class="bar-container">
                        <div class="bar fill-green" :style="{ width: (fleetStats.transit/fleetStats.total)*100 + '%' }"></div>
                    </div>
                    <span class="count">{{ fleetStats.transit }}</span>
                </div>
                
                <div class="meter-row">
                    <span class="label">DELIVERING</span>
                    <div class="bar-container">
                        <div class="bar fill-orange" :style="{ width: (fleetStats.delivering/fleetStats.total)*100 + '%' }"></div>
                    </div>
                    <span class="count">{{ fleetStats.delivering }}</span>
                </div>

                <div class="meter-row">
                    <span class="label">RETURNING</span>
                    <div class="bar-container">
                        <div class="bar fill-blue" :style="{ width: (fleetStats.idle/fleetStats.total)*100 + '%' }"></div>
                    </div>
                    <span class="count">{{ fleetStats.idle }}</span>
                </div>
            </div>

            <div class="divider"></div>

            <h3>ACTIVE UNITS</h3>
            <div class="unit-list">
                <div v-for="i in 6" :key="i" class="unit-item">
                    <n-icon class="icon"><CarSportOutline /></n-icon>
                    <div class="info">
                        <span class="id">UNIT-0{{i}}</span>
                        <span class="status">En Route to Sector {{ 7-i }}</span>
                    </div>
                    <div class="signal"></div>
                </div>
            </div>
        </aside>

        <aside class="panel right-panel">
            <h3>WAREHOUSE LEVELS</h3>
            <div class="warehouse-grid">
                <div v-for="w in warehouses" :key="w.id" class="wh-card" :style="{ borderColor: w.color }">
                    <div class="wh-header">
                        <n-icon><CubeOutline /></n-icon>
                        <span>{{ w.name }}</span>
                    </div>
                    <div class="wh-progress">
                        <div class="fill" :style="{ width: (w.stock/w.max)*100 + '%', background: w.color }"></div>
                    </div>
                    <span class="wh-val">{{ w.stock }} / {{ w.max }}</span>
                </div>
            </div>

            <div class="divider"></div>
            
            <h3>SYSTEM LOGS</h3>
            <div class="log-console">
                <div v-for="(log, i) in recentLogs" :key="i" class="log-entry" :class="log.type">
                    <span class="time">[{{ log.time }}]</span> {{ log.msg }}
                </div>
            </div>
        </aside>

    </div>
</template>

<style>
/* CSS GLOBAL PARA ETIQUETAS FLOTANTES */
.warehouse-label {
    background: rgba(0,0,0,0.8);
    border: 1px solid currentColor;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    text-align: center;
    box-shadow: 0 0 10px currentColor;
}
</style>

<style scoped>
.logistics-container {
    width: 100vw;
    height: 100vh;
    background: #000;
    color: #fff;
    font-family: 'Rajdhani', 'Segoe UI', sans-serif; /* Fuente Tech */
    overflow: hidden;
    position: relative;
}

/* HEADER */
.top-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: linear-gradient(180deg, rgba(0,20,40,0.9) 0%, rgba(0,0,0,0) 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 10;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #00ff88;
    letter-spacing: 2px;
}

.global-stats {
    display: flex;
    gap: 30px;
}

.stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.stat .label { font-size: 0.7rem; color: #888; letter-spacing: 1px; }
.stat .val { font-size: 1.2rem; font-weight: bold; font-family: monospace; }
.success { color: #00ff88; }
.danger { color: #ff0055; }

/* VIEWPORT */
.viewport-3d {
    width: 100%;
    height: 100%;
}

/* PANELS */
.panel {
    position: absolute;
    top: 80px;
    bottom: 20px;
    width: 300px;
    background: rgba(5, 10, 20, 0.85);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
}

.left-panel { left: 20px; border-left: 4px solid #00ff88; }
.right-panel { right: 20px; border-right: 4px solid #00aaff; }

h3 {
    margin: 0 0 15px 0;
    font-size: 1rem;
    color: #fff;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 5px;
    letter-spacing: 2px;
}

/* FLEET METER */
.meter-row { margin-bottom: 15px; }
.meter-row .label { font-size: 0.7rem; color: #aaa; display: block; margin-bottom: 3px; }
.bar-container { width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden; position: relative; display: inline-block; width: 80%; }
.bar { height: 100%; transition: width 0.5s; }
.count { float: right; font-family: monospace; font-size: 0.9rem; }

.fill-green { background: #00ff88; box-shadow: 0 0 10px #00ff88; }
.fill-orange { background: #ffaa00; box-shadow: 0 0 10px #ffaa00; }
.fill-blue { background: #00aaff; box-shadow: 0 0 10px #00aaff; }

/* UNIT LIST */
.unit-list { flex: 1; overflow-y: auto; }
.unit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(255,255,255,0.05);
    margin-bottom: 5px;
    border-radius: 4px;
}
.unit-item .info { display: flex; flex-direction: column; flex: 1; }
.unit-item .id { font-weight: bold; font-size: 0.9rem; color: #00ff88; }
.unit-item .status { font-size: 0.7rem; color: #888; }
.signal { width: 6px; height: 6px; background: #00ff88; border-radius: 50%; animation: blink 1s infinite; }

/* WAREHOUSES */
.warehouse-grid { display: flex; flex-direction: column; gap: 10px; }
.wh-card {
    border: 1px solid #333;
    border-left-width: 4px;
    padding: 10px;
    background: rgba(0,0,0,0.3);
}
.wh-header { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 0.9rem; margin-bottom: 5px;}
.wh-progress { height: 4px; background: #222; width: 100%; margin-bottom: 5px; }
.wh-progress .fill { height: 100%; transition: width 0.5s; }
.wh-val { font-size: 0.8rem; font-family: monospace; color: #ccc; }

/* LOGS */
.log-console {
    flex: 1;
    background: #000;
    border: 1px solid #333;
    padding: 10px;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    overflow-y: hidden;
    display: flex;
    flex-direction: column-reverse; /* Mensajes nuevos abajo visualmente */
}
.log-entry { margin-bottom: 4px; border-bottom: 1px solid #111; padding-bottom: 2px; }
.log-entry .time { color: #555; }
.log-entry.info { color: #aaa; }
.log-entry.success { color: #00ff88; }
.log-entry.error { color: #ff0055; }

.divider { height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

/* SCROLLBAR */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
</style>