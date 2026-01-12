<script setup>
import { CartOutline, GlobeOutline, TrendingUpOutline } from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

// --- VUE STATE (DATOS SIMULADOS) ---
const totalRevenue = ref(1452000);
const transactionCount = ref(8543);
const recentSales = reactive([]); // Log de ventas
const cityRanking = reactive({}); // Para el top cities

// Configuración de Ciudades (Latitud, Longitud)
const CITIES = {
    'NY': { lat: 40.7128, lon: -74.0060, name: 'New York' },
    'LON': { lat: 51.5074, lon: -0.1278, name: 'London' },
    'TYO': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
    'SYD': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
    'SP': { lat: -23.5505, lon: -46.6333, name: 'São Paulo' },
    'DB': { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
    'SIN': { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
    'BER': { lat: 52.5200, lon: 13.4050, name: 'Berlin' }
};
const cityKeys = Object.keys(CITIES);

// Productos Fake
const PRODUCTS = ['Quantum Laptop X1', 'CyberDeck Pro', 'Neural Link V3', 'Data Server Rack', 'Holo-Display 8K'];

// --- THREE.JS VARIABLES ---
const canvasContainer = ref(null);
let scene, camera, renderer, composer, controls, animationId;
let globe, cityMarkers = {};
let activeArcs = []; // Almacena los arcos volando actualmente
const GLOBE_RADIUS = 10;

// --- HELPER: CONVERTIR LAT/LON A VECTOR3 ---
const latLonToVector3 = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

// --- INIT THREE.JS ---
const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020207); // Negro azulado profundo
    scene.fog = new THREE.FogExp2(0x020207, 0.02);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 35);

    renderer = new THREE.WebGLRenderer({ antialias: false }); // Bloom se encarga del alisado
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    canvasContainer.value.appendChild(renderer.domElement);

    // 2. Post-Processing (Bloom intenso)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 2.0, 0.3, 0.1);
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 20;
    controls.maxDistance = 60;

    // --- CONSTRUCCIÓN DEL MUNDO ---
    createGlobe();
    createCityMarkers();

    // Luces ambientales sutiles
    scene.add(new THREE.AmbientLight(0x3333ff, 0.2));

    animate();
    // Iniciar simulación de datos
    setInterval(simulateTransaction, 800); // Una venta cada 800ms
};

const createGlobe = () => {
    // Esfera base oscura para tapar lo de atrás
    const baseSphere = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS - 0.1, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    scene.add(baseSphere);

    // Globo de Puntos (Estilo Tech)
    // Generamos puntos aleatorios en la superficie
    const dotGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 3000; i++) {
        // Matemáticas para distribuir puntos uniformemente en esfera
        const phi = Math.acos(-1 + (2 * i) / 3000);
        const theta = Math.sqrt(3000 * Math.PI) * phi;
        const v = new THREE.Vector3().setFromSphericalCoords(GLOBE_RADIUS, phi, theta);
        positions.push(v.x, v.y, v.z);
    }
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const dotMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x0088ff, // Azul tecnológico
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    globe = new THREE.Points(dotGeo, dotMat);
    scene.add(globe);
};

const createCityMarkers = () => {
    const markerGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Rojo/Rosa para ciudades

    for (const key in CITIES) {
        const city = CITIES[key];
        const pos = latLonToVector3(city.lat, city.lon, GLOBE_RADIUS);
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pos);
        // Añadimos un "glow" sprite
        const spriteMat = new THREE.SpriteMaterial({
            map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/glow.png'), // Usamos textura online para demo rápido
            color: 0xff0055,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.5, 1.5, 1.5);
        marker.add(sprite);

        globe.add(marker); // Añadir al globo para que roten juntos
        cityMarkers[key] = marker;
    }
};

// --- FUNCIÓN CLAVE: DISPARAR UN ARCO DE VENTA ---
const spawnArc = (startCityKey, endCityKey) => {
    const startPos = latLonToVector3(CITIES[startCityKey].lat, CITIES[startCityKey].lon, GLOBE_RADIUS);
    const endPos = latLonToVector3(CITIES[endCityKey].lat, CITIES[endCityKey].lon, GLOBE_RADIUS);

    // Calcular punto medio elevado para la curva
    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    const distance = startPos.distanceTo(endPos);
    // Cuanto más lejos, más alto el arco
    midPoint.setLength(GLOBE_RADIUS + distance * 0.3); 

    // Crear curva Bézier cúbica
    const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
    
    // Crear geometría del tubo a partir de la curva
    const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    // Material que se desvanece en los extremos
    const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Cyan neón
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const arcMesh = new THREE.Mesh(tubeGeo, tubeMat);
    // Datos para animar el ciclo de vida del arco
    arcMesh.userData = {
        life: 0, // 0 a 1
        speed: 0.01 + Math.random() * 0.02
    };
    
    globe.add(arcMesh); // Añadir al globo para rotar
    activeArcs.push(arcMesh);
};

const animate = () => {
    animationId = requestAnimationFrame(animate);
    controls.update();

    // ANIMAR ARCOS ACTIVOS
    for (let i = activeArcs.length - 1; i >= 0; i--) {
        const arc = activeArcs[i];
        arc.userData.life += arc.userData.speed;
        
        // Simular "vuelo": Animamos la opacidad o el draw range
        // Para este demo, un fade in/out simple basado en la vida
        const life = arc.userData.life;
        // Curva de opacidad: sube rápido, baja lento
        arc.material.opacity = Math.sin(life * Math.PI) * 0.8;

        if (life >= 1) {
            // Eliminar arco muerto
            globe.remove(arc);
            arc.geometry.dispose();
            arc.material.dispose();
            activeArcs.splice(i, 1);
        }
    }

    composer.render();
};

// --- SIMULACIÓN DE DATOS (VUE <-> THREE) ---
const simulateTransaction = () => {
    // Elegir dos ciudades al azar distintas
    let startKey = cityKeys[Math.floor(Math.random() * cityKeys.length)];
    let endKey = cityKeys[Math.floor(Math.random() * cityKeys.length)];
    while (startKey === endKey) {
        endKey = cityKeys[Math.floor(Math.random() * cityKeys.length)];
    }

    // Datos de la venta
    const amount = Math.floor(Math.random() * 5000) + 500;
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];

    // 1. Actualizar Estado Vue (UI Lateral)
    totalRevenue.value += amount;
    transactionCount.value++;
    
    recentSales.unshift({
        from: CITIES[startKey].name,
        to: CITIES[endKey].name,
        product: product,
        amount: `$${amount}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' })
    });
    if (recentSales.length > 8) recentSales.pop();

    // Actualizar ranking (simple counter)
    cityRanking[CITIES[endKey].name] = (cityRanking[CITIES[endKey].name] || 0) + amount;

    // 2. Disparar efecto Visual 3D
    spawnArc(startKey, endKey);

    // "Pulso" en la ciudad destino
    const marker = cityMarkers[endKey];
    if(marker) {
        // Animación simple de escala usando GSAP sería ideal, pero manual por ahora:
        // (Simplificado: solo un cambio de color momentáneo)
        marker.material.color.setHex(0xffffff);
        setTimeout(() => marker.material.color.setHex(0xff0055), 200);
    }
};

// Computada para ordenar el ranking
const sortedRanking = computed(() => {
    return Object.entries(cityRanking)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5) // Top 5
        .map(([city, amount]) => ({ city, amount }));
});

const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
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
    if(composer) composer.dispose();
    // Limpiar intervalo
    // (En un proyecto real, guarda el ID del intervalo y usa clearInterval)
});
</script>

<template>
    <div class="sales-nexus-container">
        
        <div ref="canvasContainer" class="viewport-3d"></div>

        <aside class="panel left-panel">
            <div class="panel-header">
                <n-icon color="#00ffff"><globeOutline /></n-icon>
                <h3>GLOBAL SALES STREAM</h3>
            </div>

            <div class="kpi-box">
                <div class="kpi">
                    <label>LIVE REVENUE</label>
                    <div class="value money">${{ totalRevenue.toLocaleString() }}</div>
                </div>
                <div class="kpi">
                    <label>TRANSACTIONS TODAY</label>
                    <div class="value">{{ transactionCount.toLocaleString() }}</div>
                </div>
            </div>

            <div class="divider"></div>

            <h4>RECENT TRANSACTIONS</h4>
            <div class="transaction-log">
                <div v-for="(sale, i) in recentSales" :key="i" class="log-entry">
                    <div class="log-time">{{ sale.time }}</div>
                    <div class="log-details">
                        <span class="route">{{ sale.from }} <n-icon><TrendingUpOutline/></n-icon> {{ sale.to }}</span>
                        <span class="product">{{ sale.product }}</span>
                    </div>
                    <div class="log-amount">{{ sale.amount }}</div>
                </div>
            </div>
        </aside>

        <aside class="panel right-panel">
             <div class="panel-header">
                <n-icon color="#ff0055"><CartOutline /></n-icon>
                <h3>TOP PERFORMING CITIES</h3>
            </div>

            <div class="ranking-list">
                <div v-for="(item, i) in sortedRanking" :key="item.city" class="ranking-item">
                    <div class="rank-idx">#{{ i+1 }}</div>
                    <div class="rank-city">{{ item.city }}</div>
                    <div class="rank-val">${{ item.amount.toLocaleString() }}</div>
                    <div class="rank-bar" :style="{ width: (item.amount / sortedRanking[0].amount * 100) + '%' }"></div>
                </div>
            </div>
        </aside>

    </div>
</template>

<style scoped>
.sales-nexus-container {
    width: 100vw;
    height: 100vh;
    background: #020207;
    color: #fff;
    font-family: 'Rajdhani', sans-serif; /* Fuente técnica */
    overflow: hidden;
    position: relative;
}

.viewport-3d {
    width: 100%;
    height: 100%;
    /* El canvas de Three.js va aquí */
}

/* ESTILOS DE PANELES LATERALES (Estilo Cyberpunk/Dashboard) */
.panel {
    position: absolute;
    top: 20px;
    bottom: 20px;
    width: 320px;
    background: rgba(10, 15, 30, 0.75); /* Fondo semitransparente oscuro */
    backdrop-filter: blur(12px); /* Efecto vidrio */
    border: 1px solid rgba(0, 255, 255, 0.1);
    padding: 25px;
    display: flex;
    flex-direction: column;
    pointer-events: auto; /* Permite scroll e interacción en los paneles */
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.left-panel {
    left: 20px;
    border-left: 4px solid #00ffff; /* Borde neón cyan */
}

.right-panel {
    right: 20px;
    border-right: 4px solid #ff0055; /* Borde neón rosa */
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 25px;
    font-size: 1.2rem;
    letter-spacing: 2px;
    text-transform: uppercase;
}
.panel-header h3 { margin: 0; color: #fff; font-weight: 600; }

/* KPIs */
.kpi-box { display: flex; gap: 20px; margin-bottom: 20px;}
.kpi label { display: block; font-size: 0.7rem; color: #88aaff; letter-spacing: 1px; margin-bottom: 5px;}
.kpi .value { font-size: 1.5rem; font-weight: 700; font-family: monospace;}
.money { color: #00ff88; text-shadow: 0 0 10px rgba(0,255,136,0.3);}

.divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(0,255,255,0.2), transparent); margin: 20px 0; }
h4 { margin: 0 0 15px 0; color: #88aaff; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;}

/* TRANSACTION LOG */
.transaction-log {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: monospace;
    font-size: 0.85rem;
}
.log-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: rgba(0,255,255,0.05);
    border-radius: 4px;
    border-left: 2px solid #00ffff;
    animation: slideIn 0.3s ease-out;
}
.log-time { color: #666; font-size: 0.75rem;}
.log-details { display: flex; flex-direction: column; }
.log-details .route { color: #fff; font-weight: bold; display: flex; align-items: center; gap: 5px;}
.log-details .product { color: #88aaff; font-size: 0.75rem; }
.log-amount { color: #00ff88; font-weight: bold; }

/* RANKING DERECHO */
.ranking-list { display: flex; flex-direction: column; gap: 15px; }
.ranking-item { position: relative; padding-bottom: 5px;}
.rank-idx { display: inline-block; width: 30px; color: #ff0055; font-weight: bold;}
.rank-city { display: inline-block; width: 120px; font-weight: 600;}
.rank-val { float: right; font-family: monospace; color: #ccc;}
.rank-bar {
    position: absolute;
    bottom: 0;
    left: 30px;
    height: 3px;
    background: linear-gradient(90deg, #ff0055, #ff5500);
    border-radius: 2px;
    transition: width 1s ease;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}

/* SCROLLBAR PERSONALIZADO */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.2); border-radius: 3px; }
</style>