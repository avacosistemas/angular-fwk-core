# @avacosistemas/core — CPAU Admin Framework

Este monorepo contiene los paquetes principales del framework corporativo **@avacosistemas/core**, un motor de desarrollo rápido de aplicaciones web administrativas en Angular basado en layouts densos, generación dinámica de formularios, autenticación integrada y un motor declarativo para operaciones CRUD.

---

## 🚀 Guía de Inicio Rápido (Paso a Paso)

Sigue estos pasos para crear una aplicación nueva y conectarla al framework.

### 1. Inicializar un Proyecto Angular Nuevo
El framework está diseñado para funcionar sobre proyectos Angular 17. Crea tu proyecto con soporte de estilos SCSS y enrutamiento habilitado:

```bash
npx -y @angular/cli@17 new mi-aplicacion --style=scss --routing=true --ssr=false
cd mi-aplicacion
```

---

### 2. Instalar el Framework
Puedes vincular `@avacosistemas/core` a tu proyecto de dos maneras diferentes, dependiendo de si estás en producción o en desarrollo activo.

#### Opción A: Desde Registro NPM (Producción / Uso Remoto)
Instala el paquete publicado y sus dependencias requeridas directamente desde el registro de npm:

```bash
npm install @avacosistemas/core --legacy-peer-deps
```

#### Opción B: Desde Repositorio Local (Desarrollo Activo de Framework con Symlinks)
Si estás realizando modificaciones en el código fuente de `fwk-core` y quieres probarlas en vivo en tu aplicación (`perfil-cpau`):

1. **Compilar el Framework**:
   En el directorio raíz del monorepo (`fwk-core`), ejecuta:
   ```bash
   npm run build
   ```

2. **Habilitar Espacio de Trabajo (npm workspaces) en la carpeta contenedora**:
   Dado que Angular 17+ utiliza **Vite** para el servidor de desarrollo, Vite restringe la carga de archivos ubicados fuera de la raíz del proyecto (`fs.strict`), lo cual bloquea los assets y fuentes locales de la librería con un error `403 Forbidden`.
   
   Para solucionar esto, crea un archivo `package.json` en la carpeta superior común (ej. `C:\AVACO\package.json`):
   ```json
   {
     "name": "avaco-workspace",
     "private": true,
     "workspaces": [
       "perfil-cpau",
       "fwk-core"
     ]
   }
   ```
   *Esto le indica a Vite que toda la carpeta `C:\AVACO` es un espacio de trabajo seguro y le permitirá servir las fuentes, estilos e iconos sin bloqueos.*

3. **Vincular en tu Proyecto**:
   En el `package.json` de tu proyecto Angular, agrega la ruta física hacia la carpeta de distribución compilada:
   ```json
   "dependencies": {
     "@avacosistemas/core": "file:../fwk-core/dist/packages/core"
   }
   ```
   Luego ejecuta la instalación en la raíz de tu proyecto Angular con la bandera para omitir conflictos de dependencias secundarias:
   ```bash
   npm install --legacy-peer-deps
   ```

---

### 3. Ejecutar el Schematic de Inicialización
El framework cuenta con un schematic inteligente de inicialización que prepara automáticamente todo el boilerplate, scripts, estilos y optimizaciones del compilador.

Desde la raíz de tu proyecto Angular, ejecuta:
```bash
npx ng generate @avacosistemas/core:init
```

#### ¿Qué hace este comando automáticamente?
* **`package.json`**: Añade las dependencias base (`perfect-scrollbar`, `lodash-es`, `date-fns`, etc.) e inyecta los scripts de ejecución en caliente y generación de registros (`generate:registries`).
* **`angular.json`**: Configura el mapeo de recursos para servir automáticamente los assets de fonts, iconos y tinymce en `assets/` (añadiendo `"followSymlinks": true` para desarrollos locales con symlinks), añade preprocesadores de SCSS y optimiza el enlazado.
* **`tsconfig.json`**: Establece el `baseUrl` a `.`, añade los alias de ruta (`@fwk`, `@fwk/core`, `@fwk/*`) mapeados al directorio físico de `node_modules/@avacosistemas/core` para evitar la compilación duplicada de componentes y el error `NG0912`.
* **Código Boilerplate**: Genera e inyecta la base de la aplicación (`src/main.ts`, `src/styles.scss` con los imports de estilos del framework, `src/app/app.config.ts`, `src/index.html` con splash-screen y un archivo `web.config` para soporte de rutas SPA en servidores IIS).

---

### 4. Crear un Nuevo Recurso (CRUD)
El framework implementa un sistema declarativo automático. No necesitas programar componentes ni rutas para agregar pantallas de gestión de datos.

1. **Crear la Carpeta del Recurso**:
   Crea un nuevo directorio para tu recurso en `src/app/resources/` (ej. `src/app/resources/clientes/`).
2. **Definir el Recurso (`.def.ts`)**:
   Crea un archivo de configuración del recurso (ej. `clientes.def.ts`) y define sus propiedades. Es **indispensable** que la constante termine con el sufijo `_DEF`:
   
   ```typescript
   import { CrudDef } from '@avacosistemas/core';
   import { CLIENTES_NAV_DEF } from './clientes.nav';

   export const CLIENTES_DEF: CrudDef = {
       name: 'Clientes',
       navigation: CLIENTES_NAV_DEF,
       // Define aquí columnas, formularios, API endpoints, etc.
       search: {
           fields: [
               { key: 'nombre', type: 'text', label: 'Nombre' }
           ]
       }
   };
   ```
3. **Definir la Navegación (`.nav.ts`)**:
   Crea un archivo que describa la posición en el menú lateral (ej. `clientes.nav.ts`):
   
   ```typescript
   import { NavigationItem } from '@avacosistemas/core';

   export const CLIENTES_NAV_DEF: NavigationItem = {
       id: 'clientes',
       title: 'Clientes',
       type: 'basic',
       icon: 'heroicons_outline:users',
       url: '/clientes'
   };
   ```

---

### 5. Generar Registros y Terminar la Configuración
Para que el enrutamiento perezoso (Lazy Loading) del framework detecte el nuevo recurso y lo exponga automáticamente en el sistema de navegación:

1. Ejecuta el comando de generación de registros en tu proyecto:
   ```bash
   npm run generate:registries
   ```
   *(Este comando escaneará los archivos `**/*.def.ts`, creará sus rutas lazy-load en `src/app/core/registries/crud.registry.ts` de forma automática, e inyectará los accesos en el menú de navegación)*.
2. Inicia tu servidor de desarrollo:
   ```bash
   npm start
   ```
3. Entra a `http://localhost:4200/sign-in` e inicia sesión. Tu nuevo recurso CRUD "Clientes" ya estará visible y operativo en el menú lateral.

---

## 📦 Flujo de Trabajo para Publicar Actualizaciones (NPM)

Una vez publicada la versión inicial, si deseas subir actualizaciones al registro de npm:

### 1. Incrementar la versión
npm no permite sobrescribir versiones existentes (ej: no puedes volver a subir sobre la `1.0.0`). Desde la raíz de la librería `fwk-core`, ejecuta:
```bash
npm version patch
```
*(Esto incrementará automáticamente la versión de `1.0.0` a `1.0.1` en `package.json`).*

### 2. Recompilar y publicar
1. Compila la nueva versión:
   ```bash
   npm run build
   ```
2. Ve a la carpeta compilada:
   ```bash
   cd dist/packages/core
   ```
3. Publica en el registro público de npm usando tu código dinámico de 2FA de la app móvil Google Authenticator (parámetro `--otp`):
   ```bash
   npm publish --access public
   ```

### 3. Actualizar la aplicación
En tu aplicación (`perfil-cpau`), ejecuta la instalación de la versión más reciente:
```bash
npm install @avacosistemas/core@latest --legacy-peer-deps
```