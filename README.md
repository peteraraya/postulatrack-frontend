<h1 align="center">
  <br>
  🚀 PostulaTrack
  <br>
</h1>

<h4 align="center">Plataforma inteligente para acelerar y gestionar tu búsqueda de empleo.</h4>

<p align="center">
  <a href="#características-principales">Características</a> •
  <a href="#stack-tecnológico">Stack</a> •
  <a href="#arquitectura-y-flujo">Arquitectura</a> •
  <a href="#despliegue-con-docker">Docker</a> •
  <a href="#instalación-local">Instalación Local</a>
</p>

---

## 💡 Sobre el Proyecto

**PostulaTrack** es mucho más que un simple organizador de postulaciones. Es tu asistente personal de carrera. Creado con un enfoque en la productividad, esta aplicación web te permite encontrar ofertas laborales, armar tu perfil profesional y organizar tus procesos de selección en un moderno tablero Kanban.

Pero donde realmente brilla es en su integración de **Inteligencia Artificial**: analiza tu CV contra las descripciones de las vacantes para mostrarte en qué debes mejorar (filtro de palabras clave ATS), te redacta mensajes para contactar reclutadores e incluso te prepara para tus próximas entrevistas con preguntas y respuestas ideales. Todo integrado de forma nativa.

## ✨ Características Principales

*   **Autenticación Sencilla:** Inicio de sesión en 1 clic utilizando Google.
*   **Tablero Kanban Interactivo:** Organiza el estado de tus aplicaciones de forma visual (`Enviada`, `Entrevista`, `Oferta`, `Rechazada`, `Retirada`) utilizando arrastrar-y-soltar (Drag & Drop).
*   **Buscador Inteligente de Ofertas:** Encuentra vacantes y márcalas como favoritas. Los resultados se ordenan algorítmicamente según la coincidencia con tu perfil.
*   **Perfil Potenciado:** 
    *   Previsualizador de CV inteligente integrado (Soporta PDF de forma nativa y Word a través de Google Docs).
    *   Autocompletado de habilidades sugeridas basadas en tu rol.
    *   Zona interactiva para "Drag & Drop" de documentos.
*   **El Poder de la Inteligencia Artificial:**
    *   🤖 *Análisis ATS de Ofertas:* Compara tu CV con las ofertas del mercado y descubre qué palabras clave te faltan.
    *   📝 *Generador de Mensajes:* Crea instantáneamente Cover Letters y correos de contacto y tradúcelos al inglés con 1 clic.
    *   🎓 *Simulador de Entrevistas:* Analiza una oferta de empleo específica o tu perfil general para generar las preguntas y respuestas técnicas ideales usando el formato STAR.
*   **Dashboard de Alto Nivel:** Gráficos (Chart.js) con métricas de embudo de contratación y registro de fechas de próximas entrevistas.
*   **Experiencia de Usuario Premium:** Modo Oscuro nativo, alertas Toast personalizadas y Tour Interactivo (Onboarding guiado para usuarios nuevos).

## 🛠️ Stack Tecnológico

El proyecto está desarrollado con las últimas características del ecosistema Frontend:

- **Framework:** [Angular (v17+)](https://angular.dev/) 
- **Componentes:** 100% *Standalone Components* (sin módulos tradicionales).
- **Manejo de Estado:** Angular **Signals** (`signal()`, `computed()`, `effect()`) para reactividad fina y moderna.
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) para diseños limpios y Modo Oscuro dinámico.
- **Librerías Adicionales:** 
  - `Angular CDK` (Drag and Drop)
  - `Chart.js` (Gráficos interactivos)
  - `Flatpickr` (Componente de calendarios nativo moderno)
  - `Driver.js` (Tours de Onboarding)

## 🐳 Despliegue con Docker (Producción)

El repositorio incluye una arquitectura Docker lista para producción utilizando un patrón de construcción Multi-etapa (Multi-Stage Build). 

Este patrón compila Angular utilizando una imagen ligera de Node, y luego expone los archivos estáticos resultantes (apenas unos ~100kb gracias al Lazy Loading) mediante un servidor **Nginx** optimizado con compresión GZIP y caché activa.

Para levantar el servicio completo, sitúate en la raíz del proyecto y ejecuta:

```bash
docker compose up --build -d
```
> La aplicación estará disponible en `http://localhost`.

## 💻 Instalación Local (Desarrollo)

Si deseas colaborar en el proyecto o probarlo en tu propia máquina:

### 1. Requisitos
- Node.js (v18 o superior)
- NPM (v10+)

### 2. Pasos a seguir

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Configura las variables de entorno en `src/environments/environment.ts`. 
   > Asegúrate de que `environment.apiUrl` apunte al puerto donde corre tu Backend (por defecto es `http://localhost:3000/api`).

3. Levanta el servidor de desarrollo en caliente:
   ```bash
   npm start
   ```

Abre tu navegador en `http://localhost:4200/`.

## 📚 Documentación Adicional
- Para consultar las especificaciones exactas que requiere la API Backend para comunicarse con esta interfaz, revisa el documento [BACKEND_INSTRUCTIONS.md](./BACKEND_INSTRUCTIONS.md).

---
> Diseñado y Desarrollado con ❤️ para ayudarte a alcanzar el éxito laboral.
