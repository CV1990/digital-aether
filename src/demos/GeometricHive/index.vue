<script setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

const canvasContainer = ref(null);
let scene, camera, renderer, animationId;
let mesh; // Nuestro InstancedMesh
const dummy = new THREE.Object3D(); // Objeto auxiliar para cálculos de matriz

// Configuración
const amount = 3000; // Cantidad de cubos (¡Prueba subirlo a 10000!)
const particlesData = []; // Guardaremos datos extra por cada partícula

const init = () => {
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    // 1. Scene Setup (Estilo Make Me Pulse: Fondo plano color pastel)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202025); // Gris oscuro azulado

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Sombras suaves
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.value.appendChild(renderer.domElement);

    // 2. Luces (Clave para el estilo Low Poly)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffaa00, 2); // Luz cálida
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x0055ff, 5, 50); // Luz de acento azul
    blueLight.position.set(-10, -10, 0);
    scene.add(blueLight);

    // 3. Crear el InstancedMesh
    // Geometría base (un cubo pequeño)
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    // Material "Physical" para que reaccione bien a la luz
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
    });

    mesh = new THREE.InstancedMesh(geometry, material, amount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Le decimos que se moverá mucho
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 4. Distribuir los cubos en forma de Torus Knot (Nudo)
    // Usamos matemáticas para colocar cada cubo en la superficie de un nudo invisible
    const torusKnot = new THREE.TorusKnotGeometry(6, 2, 100, 16);
    // Extraemos los vértices del nudo para usarlos como guía
    // (Este es un truco rápido para muestrear posiciones)
    const positions = torusKnot.attributes.position.array;
    
    for (let i = 0; i < amount; i++) {
        // Elegimos un vértice aleatorio del TorusKnot invisible para poner nuestro cubo
        // Hay menos vértices que partículas, así que usamos módulo para ciclar
        const i3 = (i % (positions.length / 3)) * 3; 
        
        // Añadimos un poco de aleatoriedad (jitter) para que no se vea cuadriculado
        const x = positions[i3] + (Math.random() - 0.5) * 1.5;
        const y = positions[i3 + 1] + (Math.random() - 0.5) * 1.5;
        const z = positions[i3 + 2] + (Math.random() - 0.5) * 1.5;

        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dummy.updateMatrix();

        // Aplicamos la posición a la instancia 'i'
        mesh.setMatrixAt(i, dummy.matrix);
        
        // Colorear cada instancia individualmente
        const color = new THREE.Color();
        // Gradiente de Cyan a Magenta según la posición
        color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5); 
        mesh.setColorAt(i, color);

        // Guardamos datos originales para la animación
        particlesData.push({
            originalPos: new THREE.Vector3(x, y, z),
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            scalePhase: Math.random() * Math.PI * 2
        });
    }

    // 5. Variables de Interacción
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    
    // Mouse Event
    const onMouseMove = (event) => {
        // Normalizar coordenadas del mouse (-1 a +1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();

    // --- ANIMATION LOOP ---
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Rotamos todo el enjambre lentamente
        mesh.rotation.x = Math.sin(time * 0.2) * 0.2;
        mesh.rotation.y = time * 0.1;

        // Actualizamos el Raycaster con la cámara y el mouse
        raycaster.setFromCamera(mouse, camera);

        // Calculamos la intersección "virtual" para saber dónde está el mouse en el espacio 3D
        // Usamos un plano invisible o calculamos distancia al centro
        // Para este efecto estilo MakeMePulse, haremos que las piezas "respiren"
        // y se alejen del mouse si está cerca (efecto de repulsión)

        // Nota: Actualizar 3000 matrices cada frame es costoso.
        // Optimizamos actualizando solo escalas y rotaciones locales.
        
        // Convertimos posición del mouse 2D a una dirección 3D aproximada
        const target = new THREE.Vector3(mouse.x * 15, mouse.y * 15, 0);

        for (let i = 0; i < amount; i++) {
            const data = particlesData[i];
            
            // 1. Posición base
            dummy.position.copy(data.originalPos);

            // 2. Efecto de "Respiración" y Repulsión
            // Calculamos distancia del mouse a esta partícula
            // (Aplicando la rotación inversa del grupo para que coincida)
            const worldPos = data.originalPos.clone().applyEuler(mesh.rotation);
            // Proyección simple para demo (Z=15 plano de interacción)
            const dist = worldPos.distanceTo(new THREE.Vector3(mouse.x * 20, mouse.y * 20, 10));

            // Si el mouse está cerca, empujamos la partícula hacia afuera
            let scale = 1;
            if (dist < 8) {
                const force = (8 - dist) * 0.5;
                // Empujar lejos del centro
                const dir = data.originalPos.clone().normalize(); 
                dummy.position.add(dir.multiplyScalar(force));
                scale = 1 + force * 0.5; // Hacerla más grande
            }

            // 3. Rotación individual constante
            dummy.rotation.set(
                time * data.rotationSpeed + data.scalePhase,
                time * data.rotationSpeed,
                0
            );

            dummy.scale.setScalar(scale);
            
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true; // CRUCIAL: Decirle a Three.js que renderice los cambios
        renderer.render(scene, camera);
    };

    animate();
    
    // Cleanup del listener del mouse
    onUnmounted(() => {
         window.removeEventListener('mousemove', onMouseMove);
    });
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
    if (mesh) {
        mesh.geometry.dispose();
        mesh.material.dispose();
    }
});
</script>

<template>
    <div ref="canvasContainer" class="scene-container">
        <div class="overlay">
            <h2>GEOMETRIC_HIVE</h2>
            <p>Hecho por Carlos Rivas</p>
        </div>
    </div>
</template>

<style scoped>
.scene-container {
    width: 100%;
    height: 100%;
    background-color: #202025;
    position: relative;
    overflow: hidden;
}
.overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
    pointer-events: none;
    mix-blend-mode: overlay; /* Truco de diseño para que el texto se mezcle cool */
}
h2 {
    font-family: 'Courier New', monospace;
    font-size: 3rem;
    margin: 0;
    opacity: 0.5;
    letter-spacing: 10px;
}
p {
    font-family: sans-serif;
    font-size: 1rem;
    opacity: 0.3;
    letter-spacing: 2px;
}
</style>