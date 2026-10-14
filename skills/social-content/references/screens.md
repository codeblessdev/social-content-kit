# Pantallas de la app

## Si la persona tiene capturas

- Pedí capturas puntuales: "la pantalla de stock con varios productos", "el gráfico de ganancias del mes". Mejor en
  alta resolución y sin datos reales de clientes.
- Guardalas en `brands/<id>/assets/screens/<nombre>.png`. En el video quedan en `assets/brand/screens/` (`sck video sync`).
- Si muestran datos personales o nombres de clientes, tapalos (un bloque con `backdrop-filter: blur()` sobre esa zona en la escena,
  o recortando la imagen).

## Si no tiene: reconstruir desde el código

1. Encontrá el componente de esa pantalla (`features/`, `pages/`, `views/`, `routes/`…) y leé su template y sus estilos.
2. Recreá en HTML **solo lo que se ve en el video** (encabezado, tabla, tarjetas, gráfico), dentro de la escena, con
   los tokens de la marca o los colores propios del panel si son distintos. No hace falta que sea funcional.
3. Datos de ejemplo verosímiles: `demo_numbers` y nombres de producto genéricos ("Remera básica", "Yerba 1 kg"). Nunca datos reales.
4. En el plan, aclaralo: "pantalla reconstruida desde el código".
5. Mirala con `sck snapshot` y comparala con el componente original. Si algo no se parece, ajustalo antes de seguir.

Alternativa: si la app corre localmente y la persona la levanta, sacá capturas con Chrome headless (puppeteer)
sobre la URL local con datos de prueba.
