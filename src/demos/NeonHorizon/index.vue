<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

// Referencia al contenedor HTML (el div donde vivirá el canvas)
const canvasContainer = ref(null);

// Variables globales para poder limpiarlas después
let scene, camera, renderer, animationId;
let terrain, sun;

const init = () => {
    // 1. Obtener dimensiones del CONTENEDOR (no de la ventana)
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 2. Setup Básico
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.03); // Niebla para fundir el horizonte
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10); // Cámara baja
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Agregamos el canvas al div de Vue
    canvasContainer.value.appendChild(renderer.domElement);

    // 3. Crear el Sol (Estilo Retro)
    const sunGeometry = new THREE.CircleGeometry(15, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 10, -50);
    scene.add(sun);

    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 4. Crear el Terreno Procedural
    // Usamos muchos segmentos (60x60) para tener vértices que mover
    const planeGeometry = new THREE.PlaneGeometry(60, 60, 50, 50);
    
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        wireframe: true,
        emissive: 0xbd00ff,
        emissiveIntensity: 0.5
    });

    terrain = new THREE.Mesh(planeGeometry, planeMaterial);
    terrain.rotation.x = -Math.PI / 2; // Acostamos el plano
    scene.add(terrain);

    // 5. Variables para la animación
    const clock = new THREE.Clock();
    const positionAttribute = planeGeometry.attributes.position;
    const vertex = new THREE.Vector3();

    // Loop de Animación
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Manipulación de vértices (La magia matemática)
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            // Generamos ondas basándonos en X e Y
            // La suma de dos ondas (sin + cos) crea un terreno más orgánico
            const wave1 = 2 * Math.sin(vertex.x * 0.5 + time);
            const wave2 = 1.5 * Math.cos(vertex.y * 0.3 + time * 1.5);

            // Aplicamos la altura en Z (que visualmente es Y arriba/abajo)
            vertex.z = (wave1 + wave2) * 0.8;

            positionAttribute.setZ(i, vertex.z);
        }
        
        // ¡Importante! Avisar a Three.js que la geometría cambió
        positionAttribute.needsUpdate = true;

        // Movimiento sutil de cámara "Respiración"
        camera.position.y = 3 + Math.sin(time * 0.5) * 0.5;

        renderer.render(scene, camera);
    };

    animate();
};

// Función para ajustar tamaño si el usuario cambia el tamaño de la ventana o colapsa el menú
const handleResize = () => {
    if (!canvasContainer.value || !renderer) return;
    
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
};

// CICLO DE VIDA DE VUE
onMounted(() => {
    init();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    // Limpieza estricta para evitar fugas de memoria (Memory Leaks)
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationId);
    
    // Limpiar Three.js
    if (renderer) {
        renderer.dispose();
        // Eliminar el canvas del DOM
        if (canvasContainer.value && renderer.domElement) {
           canvasContainer.value.removeChild(renderer.domElement);
        }
    }
    
    // Limpiar geometrías y materiales
    if (terrain) {
        terrain.geometry.dispose();
        terrain.material.dispose();
    }
    if (sun) {
        sun.geometry.dispose();
        sun.material.dispose();
    }
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        <div class="overlay-info">
            <h2>SYSTEM.INIT(NEON_HORIZON)</h2>
            <p>Hecho por Carlos Rivas</p>
        </div>
    </div>
</template>

<style scoped>
.scene-container {
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #050505;
    overflow: hidden;
}

.overlay-info {
    position: absolute;
    bottom: 20px;
    width: 100%;
    text-align: center;
    pointer-events: none; /* Permite clicks a través del texto */
    z-index: 10;
}

h2 {
    font-family: 'Courier New', monospace;
    color: #bd00ff;
    text-shadow: 0 0 10px #bd00ff;
    margin: 0;
    letter-spacing: 4px;
    font-size: 1.5rem;
}

p {
    font-family: sans-serif;
    color: #00ffff;
    font-size: 0.8rem;
    opacity: 0.8;
}
</style>