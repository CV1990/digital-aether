<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';
// Imports para Post-Processing (El efecto de brillo)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvasContainer = ref(null);
let scene, camera, renderer, composer, controls, animationId;
let particleSystem, lineSystem, coreSphere;

// Configuración Visual
const PARAMS = {
    particleCount: 1500, // Cantidad de nodos
    connectionRadius: 1.2, // Distancia máxima para conectar líneas
    globeRadius: 12,
    color: 0x00aaff, // Cyan base
    secondaryColor: 0x8800ff // Violeta secundario
};

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205); // Negro profundo
    scene.fog = new THREE.FogExp2(0x020205, 0.02);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 35);

    // 2. Renderer con Tone Mapping (Para que el brillo no queme la imagen)
    renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias false porque el Composer lo maneja
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    canvasContainer.value.appendChild(renderer.domElement);

    // 3. Post-Processing (Bloom Effect)
    const renderScene = new RenderPass(scene, camera);
    
    // Resolución, Fuerza, Radio, Umbral
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.strength = 1.2; // Intensidad del brillo
    bloomPass.radius = 0.5; // Difuminado
    bloomPass.threshold = 0; // Qué tan brillante debe ser algo para brillar (0 = todo brilla)

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 4. Controles (Para rotar el mundo)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan = false;

    // --- GENERACIÓN DEL MUNDO ---
    createNeuralNetwork();
    
    // --- ILUMINACIÓN ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    // Luces puntuales para dar volumen al núcleo
    const light1 = new THREE.PointLight(PARAMS.color, 2, 50);
    light1.position.set(10, 10, 10);
    scene.add(light1);
    const light2 = new THREE.PointLight(PARAMS.secondaryColor, 2, 50);
    light2.position.set(-10, -10, -10);
    scene.add(light2);

    animate();
};

const createNeuralNetwork = () => {
    // A. Puntos (Nodos) usando Esfera de Fibonacci
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color1 = new THREE.Color(PARAMS.color);
    const color2 = new THREE.Color(PARAMS.secondaryColor);

    // Algoritmo Fibonacci Sphere para distribución uniforme
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

    for (let i = 0; i < PARAMS.particleCount; i++) {
        const y = 1 - (i / (PARAMS.particleCount - 1)) * 2; // y va de 1 a -1
        const radius = Math.sqrt(1 - y * y); // radio en y
        const theta = phi * i; // ángulo dorado

        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        // Escalar al radio del globo + un poco de variación aleatoria de altura ("montañas de datos")
        const r = PARAMS.globeRadius + (Math.random() * 0.5); 
        
        positions.push(x * r, y * r, z * r);

        // Color basado en la posición Y (Gradiente vertical)
        const mixedColor = color1.clone().lerp(color2, (y + 1) / 2);
        colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // B. Líneas (Conexiones)
    // Calculamos distancias una sola vez. Esto es costoso (O(n^2)) pero solo corre al inicio.
    // Para 1500 partículas está bien en PC.
    const linePositions = [];
    const lineColors = [];
    
    // Obtenemos el array de posiciones crudo
    const p = geometry.attributes.position.array;
    const c = geometry.attributes.color.array;

    for (let i = 0; i < PARAMS.particleCount; i++) {
        const x1 = p[i * 3];
        const y1 = p[i * 3 + 1];
        const z1 = p[i * 3 + 2];

        // Comparamos con los siguientes puntos (para no repetir pares)
        // Optimizacion: Solo checar los siguientes 100 puntos (debido al orden Fibonacci, están cerca)
        for (let j = i + 1; j < Math.min(i + 50, PARAMS.particleCount); j++) {
            const x2 = p[j * 3];
            const y2 = p[j * 3 + 1];
            const z2 = p[j * 3 + 2];

            const dist = Math.sqrt((x1-x2)**2 + (y1-y2)**2 + (z1-z2)**2);

            if (dist < PARAMS.connectionRadius) {
                // Añadir par de vértices para la línea
                linePositions.push(x1, y1, z1);
                linePositions.push(x2, y2, z2);

                // Heredar color del punto de origen (más opaco para efecto sutil)
                lineColors.push(c[i*3], c[i*3+1], c[i*3+2]);
                lineColors.push(c[j*3], c[j*3+1], c[j*3+2]);
            }
        }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.15 // Líneas muy sutiles, el Bloom las hará brillar
    });

    lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSystem);

    // C. Núcleo Sólido (El planeta oscuro interior)
    // Esto oculta las líneas de atrás para que no se vea sucio
    const coreGeo = new THREE.SphereGeometry(PARAMS.globeRadius - 0.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
    });
    coreSphere = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreSphere);
};

const animate = () => {
    animationId = requestAnimationFrame(animate);
    
    controls.update(); // Mueve la cámara auto-rotate
    
    // Renderizar con Post-Processing (Bloom)
    composer.render();
};

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
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        
        <div class="hud-overlay">
            <div class="hud-header">
                <h3>NEURAL NEXUS</h3>
                <div class="subtitle">Global Connectivity Node</div>
            </div>

            <div class="hud-stats">
                <div class="stat">
                    <span class="label">NODES</span>
                    <span class="value">1,500</span>
                </div>
                <div class="stat">
                    <span class="label">LINKS</span>
                    <span class="value">ACTIVE</span>
                </div>
                <div class="stat">
                    <span class="label">SYNC</span>
                    <span class="value">98.4%</span>
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
    background: #020205;
    overflow: hidden;
}

/* UI Overlay flotante */
.hud-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    padding: 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.hud-header {
    border-left: 4px solid #00aaff;
    padding-left: 15px;
}

.hud-header h3 {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 2rem;
    color: #fff;
    letter-spacing: 4px;
    text-shadow: 0 0 10px #00aaff;
}

.subtitle {
    font-family: sans-serif;
    color: #00aaff;
    font-size: 0.8rem;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.hud-stats {
    display: flex;
    gap: 40px;
}

.stat {
    display: flex;
    flex-direction: column;
}

.stat .label {
    font-size: 0.7rem;
    color: #666;
    letter-spacing: 1px;
}

.stat .value {
    font-size: 1.2rem;
    color: #fff;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 5px rgba(255,255,255,0.5);
}
</style>