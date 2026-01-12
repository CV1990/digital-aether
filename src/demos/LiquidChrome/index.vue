<script setup>
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

const canvasContainer = ref(null);
let scene, camera, renderer, animationId;
let blob, lights = [];

// Instancia del generador de ruido
const noise3D = createNoise3D();

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Fondo negro puro

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Habilitar sombras suaves
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Tone Mapping para que los brillos se vean realistas (tipo cine)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    canvasContainer.value.appendChild(renderer.domElement);

    // 2. La Esfera Líquida (High Poly)
    // Icosahedron con mucho detalle (nivel 20) para que la deformación sea suave
    const geometry = new THREE.IcosahedronGeometry(1, 30); 
    
    // Material PBR (Physically Based Rendering)
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,   // Es metal puro
        roughness: 0.1,   // Muy pulido, casi espejo
        wireframe: false,
    });

    blob = new THREE.Mesh(geometry, material);
    blob.castShadow = true;
    blob.receiveShadow = true;
    scene.add(blob);

    // 3. Iluminación Dinámica (Studio Lights)
    // No usamos AmbientLight para que las sombras sean dramáticas
    
    // Función helper para crear luces
    const createLight = (color, intensity) => {
        const light = new THREE.PointLight(color, intensity, 10);
        light.castShadow = true;
        light.shadow.bias = -0.0001;
        scene.add(light);
        // Agregamos una esfera pequeña visual para saber dónde está la luz
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8), 
            new THREE.MeshBasicMaterial({ color: color })
        );
        light.add(bulb); 
        return light;
    };

    // Tres luces de colores "Cyberpunk"
    lights.push(createLight(0x00ffff, 80)); // Cyan
    lights.push(createLight(0xff00ff, 80)); // Magenta
    lights.push(createLight(0xffff00, 80)); // Amarillo

    // 4. Animación
    const clock = new THREE.Clock();
    
    // Guardamos la posición original de los vértices
    // geometry.attributes.position.array es un Float32Array
    const originalPositions = geometry.attributes.position.array.slice();

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // A. Animación de Luces (Orbitando)
        lights[0].position.set(Math.sin(time * 0.7) * 2, Math.cos(time * 0.5) * 2, Math.cos(time * 0.3) * 2);
        lights[1].position.set(Math.cos(time * 0.3) * 2, Math.sin(time * 0.5) * 2, Math.sin(time * 0.7) * 2);
        lights[2].position.set(Math.sin(time * 1.2) * 2.5, Math.cos(time * 1.0) * 2.5, Math.sin(time * 0.5) * 2);

        // B. Deformación de la Esfera (Noise)
        const positions = blob.geometry.attributes.position;
        const v = new THREE.Vector3(); // Vector temporal

        for (let i = 0; i < positions.count; i++) {
            // Reconstruimos el vector desde la posición original
            v.set(
                originalPositions[i * 3],
                originalPositions[i * 3 + 1],
                originalPositions[i * 3 + 2]
            );

            // Obtenemos la dirección desde el centro (Normalizar)
            v.normalize();

            // Calculamos el ruido basado en la posición del vector y el tiempo
            // Esto crea el efecto de "burbujeo"
            const noise = noise3D(
                v.x * 1.5 + time * 0.5, 
                v.y * 1.5 + time * 0.5, 
                v.z * 1.5 // El eje Z varía menos
            );
            
            // Distancia del centro: Radio base (1) + Ruido
            const distance = 1 + noise * 0.3;
            
            // Escalamos el vector
            v.multiplyScalar(distance);

            // Guardamos la nueva posición
            positions.setXYZ(i, v.x, v.y, v.z);
        }

        // IMPORTANTE: Recalcular normales para que la luz rebote correctamente en la nueva forma
        blob.geometry.computeVertexNormals();
        positions.needsUpdate = true;
        
        // Rotación lenta de la esfera completa
        blob.rotation.y += 0.002;

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
    if (renderer) renderer.dispose();
    if (blob) {
        blob.geometry.dispose();
        blob.material.dispose();
    }
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        <div class="overlay">
            <h2>LIQUID_CORE</h2>
            <p>Hecho por Carlos Rivas</p>
        </div>
    </div>
</template>

<style scoped>
.scene-container {
    width: 100%;
    height: 100%;
    background-color: #000;
    position: relative;
    overflow: hidden;
}
.overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    color: white;
    pointer-events: none;
}
h2 {
    font-family: 'Courier New', monospace;
    margin: 0;
    letter-spacing: 2px;
    font-size: 1.2rem;
    text-shadow: 0 0 10px rgba(255,255,255,0.5);
}
p {
    font-size: 0.8rem;
    opacity: 0.7;
    margin: 5px 0 0 0;
}
</style>