# Rutina Recomp

App web personal de gimnasio para recomposición corporal: 3 sesiones por semana de máximo 1:30 h, registro de kg y reps, doble progresión y temporizador de descanso. Sin dependencias ni build: HTML, CSS y JavaScript (módulos ES).

## Cómo abrirla

Los módulos ES no cargan con doble clic (`file://`), necesitan un servidor estático:

```bash
python -m http.server 5180 --directory "Rutina Recomp"
```

y abrir `http://localhost:5180`.

## Deploy en Vercel

Es un sitio estático sin build: en Vercel, **Add New → Project**, importar este repo y dejar todo por defecto (Framework Preset: *Other*, sin build command, output = raíz). Cada push a `main` publica solo.

- `vercel.json` evita que el navegador guarde `sw.js` en caché y sirve el manifest con su tipo correcto.
- `.vercelignore` deja afuera `artifact.html` (la entrada de la versión publicada en Claude) y este README.
- **En cada deploy que cambie archivos de la app, subí el número de `CACHE` en `sw.js`** (`recomp-v4` → `recomp-v5`). Así los celulares que la tienen instalada descartan la copia vieja.

Con HTTPS se puede instalar en el celular: en iPhone, Safari → Compartir → *Agregar a inicio*; en Android, Chrome → *Instalar app*. Después abre sin señal gracias al service worker.

## Cómo está pensada la rutina

- **Modos**: Mixto, Superior e Inferior. La app sugiere uno según el día (Lun mixto, Mié superior, Vie/Sáb inferior), pero se elige libremente: si las piernas vienen cargadas del CrossFit, Superior.
- **Variantes**: cada modo tiene dos plantillas (A/B) que se alternan solas según el historial.
- **Pool y ciclos**: las plantillas piden patrones de movimiento (sentadilla, bisagra, empuje horizontal…), no ejercicios. Cada 4 semanas rota el ejercicio elegido de cada patrón. Dentro del ciclo se mantiene para poder progresar en cargas. Cualquier ejercicio se puede cambiar por otro del mismo patrón y el cambio dura hasta fin del ciclo.
- **Biseries**: dos ejercicios que no compiten, alternados, con un solo descanso por ronda.
- **Calentamiento**: 10 min de bici o caminadora + core/activación. Cero cardio después.

## Estructura

```
index.html              shell de la app (header, dock del timer, diálogo de ficha)
artifact.html           misma app como página de Claude (sin <html>/<head>, lo pone el visor)
manifest.webmanifest    instalación como app
sw.js                   caché offline (red primero)
vercel.json             headers para el service worker y el manifest
assets/                 ícono SVG + PNG (192, 512, apple-touch 180, favicon 32) — provisorio
css/
  tokens.css            colores, tipografías y medidas
  app.css               layout y componentes
js/
  main.js               estado, render y eventos
  core/
    storage.js          LocalStorage tolerante a fallos
    planner.js          ciclos, variantes y armado de la sesión
    progression.js      doble progresión, volumen, 1RM estimado
  data/
    exercises.js        pool de ejercicios (patrón, rango, indicaciones)
    templates.js        plantillas por modo y calentamientos
    figures.js          poses clave de cada animación
  ui/
    figure.js           motor de figuras (cinemática inversa + SVG)
    info.js             ficha del ejercicio y cambio por alternativa
    timer.js            temporizador de descanso flotante
    dom.js              helpers
    views/              train, progress, library
```

### Agregar un ejercicio

1. Sumalo a `js/data/exercises.js` con su `pattern`. Entra solo en la rotación de ese patrón.
2. Elegí una animación existente en `fig`, o creá una en `js/data/figures.js` definiendo dos poses (`a` y `b`): cadera, ángulo del torso y objetivos de mano y pie. El motor resuelve codos y rodillas.

## Datos

Todo se guarda en el navegador (LocalStorage): historial (`recomp.history.v1`, compatible con la versión de un solo archivo), sesiones en curso y preferencias. En Progreso → Respaldo se pueden copiar e importar los datos.
