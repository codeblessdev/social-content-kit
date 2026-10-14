# Instrucciones para agentes

Este repo es **social-content-kit**: un CLI (`sck`) y una skill para generar imágenes, carruseles y videos para redes
con la línea visual de cualquier app.

Cuando la persona pida contenido para redes (posts, reels, carruseles, videos, tutoriales, memes), seguí
[skills/social-content/SKILL.md](skills/social-content/SKILL.md) paso a paso. Las preguntas iniciales y la confirmación del plan no son opcionales.

Si estás modificando el kit en sí:
- `bin/sck.mjs` es el CLI; la lógica está en `src/`. Templates en `templates/still/` (imágenes) y `templates/video/` (HyperFrames).
- Nada en este repo puede depender de una app o una marca en particular: las marcas, proyectos y resultados viven en el workspace de cada persona.
- Probá los cambios con `npm test` y con un render real (`sck render <proyecto> --draft`).
