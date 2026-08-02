# Guía Profesional de Trabajo con Git 🚀

¡Bienvenido! Este documento establece las mejores prácticas y el flujo de trabajo (Workflow) que deberíamos seguir para el desarrollo de **PostulaTrack**, garantizando un código limpio, un historial entendible y despliegues sin fricciones.

---

## 1. El Flujo de Trabajo (Git Flow Simplificado)

Para este proyecto, utilizaremos un modelo basado en **Git Flow simplificado (Feature Branch Workflow)**.

### Ramas Principales:
- `main` (o `master`): **Nunca se programa directamente aquí.** Contiene únicamente el código estable que está en Producción.
- `develop`: Es la rama principal de desarrollo. Aquí integramos todas las nuevas características antes de pasarlas a Producción. (👉 *Ya me he encargado de crearla y cambiarte a ella en tu entorno local*).

### Ramas Secundarias (Temporales):
Cuando vayas a crear una nueva funcionalidad, arreglar un bug o modificar algo, SIEMPRE debes crear una rama nueva a partir de `develop`.
Los nombres de estas ramas deben seguir esta convención:
- `feature/nombre-de-la-funcionalidad` (ej. `feature/login-google`)
- `bugfix/nombre-del-error` (ej. `bugfix/error-400-cv`)
- `hotfix/nombre-del-error-critico` (ej. `hotfix/caida-bd` - *estas nacen de main, no de develop*)
- `docs/actualizacion-readme` (ej. `docs/guia-git`)

### ¿Cómo es el ciclo de vida de una tarea?
1. Actualizas tu rama base: `git checkout develop` y `git pull origin develop`.
2. Creas tu rama de trabajo: `git checkout -b feature/nueva-grafica`.
3. Escribes tu código y haces tus commits.
4. Subes tu rama al repositorio remoto: `git push origin feature/nueva-grafica`.
5. Creas un **Pull Request (PR)** o **Merge Request** hacia `develop`.
6. Una vez aprobado, se hace el merge a `develop` y se borra la rama temporal.

---

## 2. Convención de Commits (Conventional Commits)

Es vital saber *qué* se hizo con solo leer el historial de git. Utilizaremos el estándar de la industria **Conventional Commits**.

El formato es:
`tipo(contexto-opcional): descripción breve en imperativo`

### Tipos Permitidos:
*   ✨ `feat`: Una nueva característica para el usuario.
*   🐛 `fix`: Solución a un error/bug.
*   ♻️ `refactor`: Refactorización de código que no añade características ni soluciona bugs (ej. limpiar código muerto).
*   💄 `style`: Cambios de formato, espacios, punto y coma, CSS, etc.
*   🚀 `perf`: Cambios de código que mejoran el rendimiento.
*   🧪 `test`: Añadir o corregir pruebas automáticas (Jasmine/Karma/Vitest).
*   📦 `build` o `chore`: Cambios en el sistema de construcción, dependencias, o configuración (npm, docker).
*   📝 `docs`: Cambios exclusivos en la documentación (README, instrucciones).

### Ejemplos Reales:
*   `feat(auth): integrar inicio de sesión con Google`
*   `fix(profile): corregir error 400 al descargar el CV`
*   `style(dashboard): actualizar colores del gráfico funnel`
*   `docs: añadir guía de flujo de trabajo de Git`

---

## 3. Mejores Prácticas y Sugerencias de Oro

1. **Commits Atómicos:** Un commit debe representar **una sola idea o cambio lógico**. No hagas un commit llamado `feat: cambios varios` que incluya arreglos de CSS, nuevas pantallas y cambios en el backend. Sepáralos.
2. **Haz Pull constantemente:** Antes de empezar a programar cada mañana, haz `git pull origin develop` para asegurarte de que tienes lo último que subió tu equipo y evitar conflictos masivos.
3. **No subas archivos basura:** Gracias al nuevo archivo `.gitignore` que generamos, ya estás protegido contra subir las carpetas `/node_modules`, `/dist` o tus `.env` secretos. ¡Nunca fuerces la subida de un `.env`!
4. **Revisión de Código (Code Review):** Nunca hagas merge de tus propios Pull Requests sin que al menos un compañero de equipo le dé el visto bueno. Esto reduce los errores en producción drásticamente.
5. **Mensajes Claros:** Si un commit soluciona un ticket específico, añádelo al final del mensaje. Ej: `fix: corregir superposición de modales (Cierra #42)`

---

## 4. Resumen Rápido (Chuleta)

```bash
# 1. Empezar una nueva tarea
git checkout develop
git pull origin develop
git checkout -b feature/nombre-tarea

# 2. Guardar tu trabajo
git add .
git commit -m "feat(modulo): descripción clara de lo que hiciste"

# 3. Subirlo para revisión
git push origin feature/nombre-tarea
# -> (Ir a GitHub/GitLab y crear el Pull Request hacia develop)
