# social-content-kit

Genera contenido para redes (imágenes, carruseles, reels y videos con voz en off y subtítulos) **con la línea visual de
cualquier app**, a partir de su repo o de la carpeta en tu compu. Funciona con cualquier agente de IA que lea skills o
`AGENTS.md` (Claude Code, Codex, Cursor, Gemini CLI, Copilot, OpenCode…), y también a mano con el CLI `sck`.

```
Vos: "Quiero un reel para Instagram de la app X"
Agente: te pregunta app · tipo · plataforma · objetivo
        → saca la marca del código de la app (colores, fuentes, logo, textos) y te la confirma
        → te pide capturas (o reconstruye las pantallas desde el código)
        → te propone un plan escena por escena y ESPERA tu OK
        → genera voz, subtítulos y el video, lo revisa y te deja todo para publicar
```

Nunca publica nada: vos revisás y subís.

## Instalación

Requisitos: Node 22+, Google Chrome, git y FFmpeg (para video y voz). Docker es opcional.

```bash
git clone https://github.com/codeblessdev/social-content-kit.git ~/social-content-kit
cd ~/social-content-kit && npm install && npm link   # deja el comando "sck" disponible
sck doctor                                           # chequea qué falta
sck setup voice                                      # opcional: voz en off local (Kokoro, gratis)
```

> En Debian/Ubuntu, `sck setup voice` necesita `sudo apt install python3-venv`. FFmpeg: `sudo apt install ffmpeg` / `brew install ffmpeg`.

### Conectarlo a tu agente

- **Cualquier agente que soporte Agent Skills** (Claude Code, Codex, Cursor, Gemini CLI, Copilot, OpenCode…):
  ```bash
  npx skills add codeblessdev/social-content-kit
  ```
- **A mano**: copiá o enlazá `skills/social-content/` en la carpeta de skills de tu agente
  (por ejemplo `ln -s ~/social-content-kit/skills/social-content ~/.claude/skills/social-content`).
- **Sin soporte de skills**: abrí el agente dentro de esta carpeta (lee `AGENTS.md`) o pegale
  "Seguí ~/social-content-kit/skills/social-content/SKILL.md".

Después pedile algo como *"armá un carrusel para LinkedIn de la app que está en ~/proyectos/mi-app"*.

## Dónde queda todo

El kit no guarda nada de tus apps. Todo va a un **workspace** (`./social-content` por defecto, o `--workspace` / `$SCK_WORKSPACE`):

```
social-content/
  brands/<app>/        brand.json (tokens, voz, hechos), fonts.css, assets/{logos,photos,screens,refs}
  projects/<fecha>-<nombre>/
    plan.json          lo que se aprueba antes de producir
    <pieza-video>/     proyecto HyperFrames del video
    out/               PNG, MP4, caption.txt e index.html para revisar
  .sources/            repos clonados desde un link
```

Si trabajan en equipo, el workspace puede ser su propio repo para compartir marcas y proyectos.

## CLI

```
sck brand init <link|owner/repo|carpeta> --id <id>   escanea la app y deja un borrador de marca
sck brands                                           marcas del workspace
sck project new "<nombre>" --brand <id> --platform <p> [--goal <objetivo>]
sck video new <proyecto> <pieza>                     proyecto HyperFrames para una pieza de video
sck voice <proyecto> <pieza>                         voz (Kokoro) + tiempos + subtítulos
sck timing <proyecto> <pieza>                        tiempos y subtítulos sin regenerar la voz
sck check | snapshot <proyecto> <pieza>              validar / sacar cuadros clave
sck render <proyecto> [--only <pieza>] [--draft]     renderizar y armar la página de revisión
```

`sck help` muestra todo, incluidas las plataformas y formatos.

## Cómo funciona

- **Imágenes y carruseles**: `templates/still/` (HTML + CSS), capturados con Chrome headless. Layouts: portada, frase,
  foto, captura, foto + texto, dato con gráfico, paso, lista, planes y CTA. Toman colores, fuentes y logo de `brand.json`.
- **Videos**: [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → MP4). `templates/video/` trae la base:
  escenas, subtítulos, zona segura por plataforma y ayudas de animación (`kit.js`). Las escenas de cada video las escribe el agente.
- **Voz y subtítulos**: Kokoro (local, gratis) sintetiza la locución de cada escena por separado. La escena dura lo que dura
  su locución, y los subtítulos se reparten dentro de esa toma, así quedan sincronizados sin transcribir.
- **Marca**: `sck brand init` escanea CSS, HTML y componentes (colores por frecuencia, variables CSS, fuentes, Google Fonts,
  logos, imágenes, títulos y README). El agente lo cura mirando la landing y te lo confirma.

## Desarrollo

```bash
npm test
```

HyperFrames manda telemetría anónima de uso; se desactiva con `npx hyperframes telemetry disable`.
