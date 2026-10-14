import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scan } from '../src/brand.mjs';
import { sizeFor } from '../src/formats.mjs';
import { captionTimes, chunk } from '../src/voice.mjs';

test('chunk corta en la puntuación y respeta el máximo de palabras', () => {
  assert.deepEqual(chunk('¿Seguís usando esto? Pantallas de hace veinte años, planillas aparte.'), [
    '¿Seguís usando esto?', 'Pantallas de hace', 'veinte años,', 'planillas aparte.',
  ]);
});

test('captionTimes reparte toda la duración sin huecos', () => {
  const caps = captionTimes('Stock, ventas y ganancias en un solo panel.', 2, 3);
  assert.equal(caps[0].start, 2);
  assert.ok(Math.abs(caps.at(-1).end - 5) < 0.01);
  for (let i = 1; i < caps.length; i++) assert.equal(caps[i].start, caps[i - 1].end);
  assert.equal(caps[0].text, 'Stock'); // sin la coma final
});

test('sizeFor usa la plataforma y permite pisar el tamaño', () => {
  assert.deepEqual(sizeFor('instagram', { type: 'video', format: 'reel' }), [1080, 1920]);
  assert.deepEqual(sizeFor('youtube', { type: 'video', format: 'video' }), [1920, 1080]);
  assert.deepEqual(sizeFor('instagram', { type: 'image', size: [800, 800] }), [800, 800]);
});

test('scan encuentra colores, fuentes y textos de una app', () => {
  const s = scan(fileURLToPath(new URL('./fixture-app', import.meta.url)));
  assert.equal(s.colors[0].hex, '#e4572e');
  assert.ok(s.colors.some((c) => c.hex === '#fbf7f0'));
  assert.equal(s.fonts[0].family, 'Inter');
  assert.equal(s.google_fonts.length, 1);
  assert.deepEqual(s.titles, ['Mi App']);
  assert.equal(s.css_vars['--brand'], '#e4572e');
});
