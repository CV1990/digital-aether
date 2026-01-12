<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

// Referencias UI
const canvasContainer = ref(null);
const emailInput = ref(null);
const passwordInput = ref(null);

// Estado de Carga
const isLoading = ref(false);

// Variables Three.js
let scene, camera, renderer, animationId;
let particlesGroup;

// Estado para la animación 3D
const targetRotation = { x: 0, y: 0 };
const mouse = { x: 0, y: 0 };
let targetCameraZ = 5; 
let currentCameraZ = 5;
let targetColor = new THREE.Color(0x00aaff); 
// Nuevo: Multiplicador de velocidad para el efecto "Warp Speed"
let speedMultiplier = 1; 

// --- THREE.JS INIT ---
const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a10);
    scene.fog = new THREE.FogExp2(0x0a0a10, 0.05);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Fix CSS
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0';
    
    canvasContainer.value.appendChild(renderer.domElement);

    particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });

    for (let i = 0; i < 150; i++) {
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.x = (Math.random() - 0.5) * 20;
        mesh.position.y = (Math.random() - 0.5) * 20;
        mesh.position.z = (Math.random() - 0.5) * 20;
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.z = Math.random() * Math.PI;
        
        mesh.userData = {
            rotSpeed: (Math.random() - 0.5) * 0.02,
            initialY: mesh.position.y
        };
        particlesGroup.add(mesh);
    }

    const animate = () => {
        animationId = requestAnimationFrame(animate);

        // A. Rotación del grupo (Acelerada si isLoading es true)
        targetRotation.x = mouse.y * 0.5;
        targetRotation.y = mouse.x * 0.5;
        
        // Si está cargando, forzamos una rotación rápida automática
        const rotationForce = isLoading.value ? 2.0 : 0.05;
        
        particlesGroup.rotation.x += (targetRotation.x - particlesGroup.rotation.x) * rotationForce * speedMultiplier;
        particlesGroup.rotation.y += (targetRotation.y - particlesGroup.rotation.y) * rotationForce * speedMultiplier;

        // B. Animación partículas individuales
        particlesGroup.children.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotSpeed * speedMultiplier;
            mesh.rotation.y += mesh.userData.rotSpeed * speedMultiplier;
        });

        // C. Zoom Dinámico
        // Lerp más rápido si estamos cargando
        currentCameraZ += (targetCameraZ - currentCameraZ) * (isLoading.value ? 0.1 : 0.05);
        camera.position.z = currentCameraZ;

        // D. Color
        particlesGroup.children.forEach(mesh => {
            mesh.material.color.lerp(targetColor, 0.05);
        });

        renderer.render(scene, camera);
    };

    animate();
};

// --- LÓGICA DEL BOTÓN CONNECT ---
const handleConnect = () => {
    if (isLoading.value) return; // Evitar doble click

    isLoading.value = true;
    
    // 1. EFECTO 3D: Warp Speed
    targetCameraZ = 2.5; // Zoom IN agresivo (entrando al sistema)
    targetColor.setHex(0x00ff88); // Verde Matrix/Éxito
    speedMultiplier = 5.0; // Acelerar todo x5

    // 2. TIMEOUT 5 SEGUNDOS
    setTimeout(() => {
        isLoading.value = false;
        
        // Restaurar estado
        targetCameraZ = 5; // Zoom normal
        targetColor.setHex(0x00aaff); // Volver a Cyan
        speedMultiplier = 1.0; // Velocidad normal
        
        // Opcional: Limpiar inputs
        if(emailInput.value) emailInput.value.value = '';
        if(passwordInput.value) passwordInput.value.value = '';
        
    }, 5000);
};

const handleEmailFocus = () => {
    if(isLoading.value) return;
    targetCameraZ = 5; 
    targetColor.setHex(0x00aaff); 
};

const handlePasswordFocus = () => {
    if(isLoading.value) return;
    targetCameraZ = 3; 
    targetColor.setHex(0xbd00ff); 
};

// ... (Resto del código de Resize y Mount igual) ...
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
        <div class="login-card">
            <div class="login-header">
                <h3>SYSTEM ACCESS</h3>
                <p>Secure Node v.3.0 - Hecho por carlos rivas</p>
            </div>
            
            <form class="login-form" @submit.prevent="handleConnect">
                <div class="input-group">
                    <label>Email/Username</label>
                    <input 
                        ref="emailInput" 
                        type="text" 
                        placeholder="user@corp.net"
                        @focus="handleEmailFocus"
                        :disabled="isLoading"
                    >
                </div>
                
                <div class="input-group">
                    <label>Password</label>
                    <input 
                        ref="passwordInput" 
                        type="password" 
                        placeholder="••••••••"
                        @focus="handlePasswordFocus"
                        @blur="handleEmailFocus" 
                        :disabled="isLoading"
                    >
                </div>

                <button 
                    class="login-btn" 
                    :class="{ 'loading-state': isLoading }"
                    :disabled="isLoading"
                >
                    <span v-if="!isLoading">CONNECT</span>
                    
                    <div v-else class="tech-loader">
                        <span class="scanner"></span>
                        <span class="text">ESTABLISHING UPLINK...</span>
                    </div>
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
/* ... (Todo el CSS anterior se mantiene igual, agregamos lo siguiente al final) ... */

.scene-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.scene-container :deep(canvas) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
}

.login-card {
    /* ... Tus estilos anteriores ... */
    position: relative;
    width: 350px;
    padding: 40px;
    background: rgba(255, 255, 255, 0.03); 
    backdrop-filter: blur(10px); 
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.5);
    z-index: 10;
}
/* ... (Estilos de input, label, header anteriores) ... */
.login-header h3 { margin: 0; color: white; font-family: 'Courier New', monospace; text-align: center; letter-spacing: 2px;}
.login-header p { margin: 5px 0 30px 0; color: rgba(255,255,255,0.4); font-size: 0.8rem; text-align: center; text-transform: uppercase;}
.input-group { margin-bottom: 20px; }
.input-group label { display: block; color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-bottom: 8px; }
.input-group input { width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; outline: none; transition: 0.3s; box-sizing: border-box; }
.input-group input:focus { border-color: #00aaff; background: rgba(0, 170, 255, 0.1); box-shadow: 0 0 15px rgba(0, 170, 255, 0.3); }
.input-group input[type="password"]:focus { border-color: #bd00ff; background: rgba(189, 0, 255, 0.1); box-shadow: 0 0 15px rgba(189, 0, 255, 0.3); }
.input-group input:disabled { opacity: 0.5; cursor: not-allowed; }

/* --- ESTILOS DEL BOTÓN Y LOADER --- */

.login-btn {
    width: 100%;
    height: 50px; /* Altura fija para evitar saltos al cambiar contenido */
    background: linear-gradient(90deg, #00aaff, #0077cc);
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    letter-spacing: 1px;
    transition: 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-btn:hover:not(:disabled) {
    background: linear-gradient(90deg, #0088cc, #005599);
    letter-spacing: 2px;
    box-shadow: 0 0 20px rgba(0, 170, 255, 0.4);
}

.login-btn:disabled {
    cursor: wait;
    background: rgba(0, 20, 40, 0.8); /* Fondo oscuro al cargar */
    border: 1px solid #00aaff;
}

/* El Loader Tech */
.tech-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    position: relative;
}

.tech-loader .text {
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #00ff88;
    animation: blink 0.5s infinite alternate;
}

/* Efecto de escaner cibernético */
.tech-loader .scanner {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0%;
    background: rgba(0, 255, 136, 0.2);
    border-right: 2px solid #00ff88;
    animation: scan 2s infinite linear;
}

@keyframes blink {
    from { opacity: 0.4; }
    to { opacity: 1; }
}

@keyframes scan {
    0% { width: 0%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { width: 100%; opacity: 0; }
}
</style>