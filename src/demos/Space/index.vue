<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

// Referencia al contenedor HTML
const canvasContainer = ref(null);
let renderer, scene, camera, animationId;

const init = () => {
    // 1. Setup usando el tamaño del contenedor, NO window.innerWidth
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    canvasContainer.value.appendChild(renderer.domElement);

    // ... AQUÍ PEGAS TU CÓDIGO DE PARTÍCULAS ...
    // ... (Creación de geometry, materials, mesh) ...
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    };
    animate();
};

// Resize Observer: Mucho mejor que window.addEventListener('resize')
// Detecta si el div contenedor cambia de tamaño (ej. si colapsas el sidebar)
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
    // LIMPIEZA IMPORTANTE PARA SPA
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationId);
    renderer.dispose();
    // Si tienes geometrías o texturas pesadas, haz dispose() aquí también
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        <div class="overlay-info">
            <p>Hecho por Carlos Rivas</p>
        </div>
    </div>
</template>

<style scoped>
.scene-container {
    width: 100%;
    height: 100%;
    background: black;
    overflow: hidden;
}

.overlay-info {
    position: absolute;
    bottom: 20px;
    width: 100%;
    text-align: center;
    pointer-events: none;
    /* Permite clicks a través del texto */
    z-index: 10;
}
</style>