# brand.json

`sck brand init` deja un borrador (`"status": "draft"`) y un `scan.json` con lo que encontró en el código. Tu trabajo es curarlo.

## Tokens

Las piezas usan solo estos tokens; todos tienen que existir:

| token | qué es |
|---|---|
| `bg` | fondo general (claro u oscuro, el de la landing) |
| `surface` | tarjetas sobre el fondo |
| `ink` | texto principal y fondo de las escenas oscuras |
| `ink-soft` | texto secundario |
| `muted` | kicker, notas, pie |
| `line` | bordes suaves (`rgba`) |
| `on-ink` | texto sobre `ink` |
| `accent` | color de marca para destacar (números de paso, barra destacada) |
| `positive` | verde o segundo color (variaciones positivas) |
| `font-display` | titulares, con fallback (`'Instrument Serif', Georgia, serif`) |
| `font-body` | texto, con fallback |
| `radius` | radio de tarjetas (`28px`) |

**Tomá los colores de la cara pública de la app** (landing, home, login), no del panel interno: la app suele tener azules
o grises de framework que no son la marca. `scan.json` → `colors` ordena por frecuencia y trae `css_vars`; abrí los
archivos de `landing_candidates` y sus estilos para confirmar. Verificá contraste: `ink` sobre `bg` y `on-ink` sobre `ink`.

Fuentes: `sck brand init` baja las de Google Fonts que encuentre y arma `fonts.css`. Si la marca usa una fuente local
(`.woff2` en el repo), copiala a `brands/<id>/fonts/` y agregá el `@font-face` a `fonts.css`.

## Voz y hechos

- `voice.language`: idioma y registro (por ejemplo "es-AR con voseo").
- `voice.rules`: 3 a 6 reglas observadas en el copy real (largo de frases, signos, emojis, a quién le habla).
- `voice.examples`: 3 a 5 frases textuales de la landing.
- `facts`: `pitch`, `problem`, `steps`, `features` ({title, text, photo}), `plans` ({name, price, note, featured, extra}),
  `trial`, `cta`. **Solo lo que esté en el código, el README o lo que diga la persona.**
- `photos`: describí cada foto en una línea (qué muestra, vertical u horizontal) para elegirla sin abrirla.
- `demo_numbers`: los números de ejemplo de la landing, si hay.
- `handle`: la cuenta donde se publica. Preguntala si no la sabés.

Antes de confirmar, mostrale a la persona: paleta (hex), fuentes, 3 ejemplos de voz y la lista de hechos.
