import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scan } from '../src/brand.mjs';
import { sizeFor } from '../src/formats.mjs';
import { lang } from '../src/i18n.mjs';
import { captionTimes, chunk, voiceFor } from '../src/voice.mjs';

test('chunk breaks at punctuation and respects the word limit', () => {
  assert.deepEqual(chunk('Still using this? Screens from twenty years ago, spreadsheets on the side.'), [
    'Still using this?', 'Screens from twenty', 'years ago,', 'spreadsheets on the', 'side.',
  ]);
});

test('chunk works for Spanish', () => {
  assert.deepEqual(chunk('¿Seguís usando esto? Pantallas viejas, planillas aparte.'), ['¿Seguís usando esto?', 'Pantallas viejas,', 'planillas aparte.']);
});

test('chunk splits languages written without spaces by characters', () => {
  const parts = chunk('在线预约，一个面板管理所有客户和付款记录。');
  assert.ok(parts.length >= 2);
  assert.equal(parts.join(''), '在线预约，一个面板管理所有客户和付款记录。');
  assert.ok(parts.every((p) => p.length <= 12));
});

test('captionTimes spreads the whole duration without gaps', () => {
  const caps = captionTimes('Bookings, clients and payments in one place.', 2, 3);
  assert.equal(caps[0].start, 2);
  assert.ok(Math.abs(caps.at(-1).end - 5) < 0.01);
  for (let i = 1; i < caps.length; i++) assert.equal(caps[i].start, caps[i - 1].end);
  assert.equal(caps[0].text, 'Bookings'); // trailing comma removed
});

test('lang normalizes codes and falls back sensibly', () => {
  assert.equal(lang('es-AR').code, 'es');
  assert.equal(lang('pt').code, 'pt-BR');
  assert.equal(lang('en-gb').code, 'en-GB');
  assert.equal(lang('EN').code, 'en');
  assert.equal(lang('es').ui.swipe, 'Deslizá');
  assert.equal(lang('de').known, false);
});

test('voiceFor picks the default voice of the plan language', () => {
  assert.deepEqual(
    { voice: voiceFor({}, { language: 'es' }).voice, lang: voiceFor({}, { language: 'es' }).lang },
    { voice: 'ef_dora', lang: 'es' },
  );
  assert.equal(voiceFor({ voice: { gender: 'male' } }, { language: 'en' }).voice, 'am_michael');
  assert.equal(voiceFor({ voice: { voice: 'bf_emma' } }, { language: 'en' }).voice, 'bf_emma');
  assert.throws(() => voiceFor({}, { language: 'de' }), /No default voice/);
  assert.equal(voiceFor({ voice: { voice: 'xx_custom', lang: 'de' } }, { language: 'de' }).voice, 'xx_custom');
});

test('sizeFor uses the platform and allows overriding the size', () => {
  assert.deepEqual(sizeFor('instagram', { type: 'video', format: 'reel' }), [1080, 1920]);
  assert.deepEqual(sizeFor('youtube', { type: 'video', format: 'video' }), [1920, 1080]);
  assert.deepEqual(sizeFor('instagram', { type: 'image', size: [800, 800] }), [800, 800]);
});

test('scan finds colors, fonts and copy in an app', () => {
  const s = scan(fileURLToPath(new URL('./fixture-app', import.meta.url)));
  assert.equal(s.colors[0].hex, '#e4572e');
  assert.ok(s.colors.some((c) => c.hex === '#fbf7f0'));
  assert.equal(s.fonts[0].family, 'Inter');
  assert.equal(s.google_fonts.length, 1);
  assert.deepEqual(s.titles, ['Mi App']);
  assert.equal(s.css_vars['--brand'], '#e4572e');
});
