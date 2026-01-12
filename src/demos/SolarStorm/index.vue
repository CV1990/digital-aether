<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

const canvasContainer = ref(null);
let scene, camera, renderer, animationId;
let sunMesh, sunMaterial;

// --- GLSL SHADERS ---
// El Vertex Shader se encarga de la FORMA (deformar la esfera)
const vertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;
varying float vNoise;

// Función simple de ruido pseudo-aleatorio
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  // Algoritmo de Simplex Noise (optimizado para GLSL)
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
  i = mod289(i);
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );  
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vUv = uv;
  // Calculamos el ruido basado en el tiempo para que se mueva
  float noise = snoise(position * 2.0 + uTime * 0.2);
  vNoise = noise; // Pasamos el ruido al fragment shader para colorearlo
  
  // Desplazamos los vértices hacia afuera según el ruido (Efecto explosión)
  vec3 newPosition = position + normal * (noise * 0.3);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// El Fragment Shader se encarga del COLOR (pintar el fuego)
const fragmentShader = `
uniform float uTime;
varying float vNoise;

void main() {
  // Colores base del fuego: Rojo profundo y Amarillo brillante
  vec3 colorA = vec3(0.9, 0.1, 0.1); // Rojo
  vec3 colorB = vec3(1.0, 0.8, 0.0); // Amarillo
  
  // Mezclamos los colores según la "altura" del ruido
  // Si el ruido es alto (pico), es más amarillo (caliente)
  // Si es bajo (valle), es más rojo (frío)
  vec3 finalColor = mix(colorA, colorB, vNoise * 2.0 + 0.5);
  
  // Añadimos un brillo extra
  float brightness = vNoise * 0.5 + 0.5;
  
  gl_FragColor = vec4(finalColor * (1.0 + brightness), 1.0);
}
`;

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Setup básico
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.value.appendChild(renderer.domElement);

    // 2. Crear el ShaderMaterial
    // Aquí conectamos JS con GLSL
    sunMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            uTime: { value: 0 } // Variable que actualizaremos en cada frame
        },
        wireframe: false
    });

    // 3. Crear la Esfera
    const geometry = new THREE.IcosahedronGeometry(1, 60); // ¡Muy alta resolución!
    sunMesh = new THREE.Mesh(geometry, sunMaterial);
    scene.add(sunMesh);

    // 4. Glow (Resplandor exterior simple) - Truco visual
    const glowGeo = new THREE.IcosahedronGeometry(1.2, 10);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.1,
        wireframe: true
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    // Animación
    const clock = new THREE.Clock();

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Actualizamos el tiempo en el Shader
        sunMaterial.uniforms.uTime.value = elapsedTime;

        // Rotación lenta
        sunMesh.rotation.y = elapsedTime * 0.1;
        glowMesh.rotation.y = elapsedTime * 0.05;
        glowMesh.rotation.x = elapsedTime * 0.02;

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
    if (sunMaterial) sunMaterial.dispose();
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        <div class="overlay">
            <h2>SOLAR_STORM</h2>
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
    bottom: 30px;
    right: 30px;
    text-align: right;
    color: white;
    pointer-events: none;
}
h2 {
    font-family: 'Courier New', monospace;
    margin: 0;
    color: #ffaa00;
    text-shadow: 0 0 15px #ff4400;
}
p {
    font-size: 0.8rem;
    color: #ff4400;
    opacity: 0.8;
}
</style>