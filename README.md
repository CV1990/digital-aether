# Digital Aether 🌌

[![Three.js](https://img.shields.io/badge/Three.js-r160-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Digital Aether** es una exploración técnica y artística sobre la manipulación de partículas en el navegador. Este proyecto demuestra cómo renderizar y animar miles de puntos en tiempo real manteniendo 60 FPS, utilizando técnicas de optimización de memoria en WebGL.

🔗 **[Ver Demo en Vivo](AQUI_TU_LINK_DE_VERCEL_O_GITHUB_PAGES)**

---

## 🚀 Características Técnicas

Este no es solo un visualizador, es una demostración de gestión eficiente de recursos gráficos:

* **Optimización de Geometría:** Uso de `THREE.BufferGeometry` y `Float32Array` para gestionar posiciones de partículas directamente en memoria, evitando la sobrecarga de objetos geométricos complejos.
* **Interacción en Tiempo Real:** Sistema de *Raycasting* simplificado/interpolación lineal (Lerp) para mapear la posición del mouse a la rotación de la cámara y la escena, creando una sensación de profundidad y paralaje.
* **Estética Visual:** Implementación de `AdditiveBlending` para simular efectos de luz volumétrica cuando las partículas se superponen.
* **Responsive:** Ajuste dinámico del *aspect ratio* y la matriz de proyección ante cambios en el viewport.

## 🛠️ Stack Tecnológico

* **Core:** JavaScript (ES6+ Modules)
* **Render Engine:** Three.js (WebGL)
* **Build Tool:** (Vanilla / Vite)

## 📦 Instalación y Uso

Este proyecto utiliza módulos ES6 nativos. Para ejecutarlo localmente necesitas un servidor de desarrollo para evitar políticas de CORS.

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/digital-aether.git](https://github.com/tu-usuario/digital-aether.git)
    cd digital-aether
    ```

2.  **Ejecutar:**
    * Si usas VS Code: Instala la extensión "Live Server" y haz clic en "Go Live".
    * O usando Node/NPM:
        ```bash
        npx vite
        ```

## 📸 Previa

*(Aquí te recomiendo poner un GIF o una captura de pantalla de tu demo)*
![Digital Aether Preview](./screenshot.png)

## 👤 Autor

Desarrollado por **Carlos Rivas**.
* 💼 [LinkedIn](https://www.linkedin.com/in/carlos-rivas03/)
* 🌐 [Portafolio](https://margora.com)

---
*Este proyecto es parte de mi serie de experimentos sobre Creative Development y tecnologías inmersivas.*