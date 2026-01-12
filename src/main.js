import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Importamos el router que acabamos de crear

// Opcional: Fuente monoespaciada para que se vea más "Coder" (vfonts)
// Si no quieres instalar vfonts, puedes borrar esta línea.
import 'vfonts/FiraCode.css';

const app = createApp(App)

app.use(router) // ¡Importante!
app.mount('#app')