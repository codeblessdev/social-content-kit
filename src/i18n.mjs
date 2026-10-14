// Content languages: default Kokoro voices, phonemizer code and the few UI strings the templates print.
// A plan's "language" (BCP 47, e.g. "en", "es", "pt-BR") drives voice-over, captions, on-screen text and <html lang>.

export const LANGS = {
  en: { name: 'English (US)', tts: 'en-us', voices: { female: 'af_heart', male: 'am_michael' }, ui: { swipe: 'Swipe', recommended: 'Recommended' } },
  'en-GB': { name: 'English (UK)', tts: 'en-gb', voices: { female: 'bf_emma', male: 'bm_george' }, ui: { swipe: 'Swipe', recommended: 'Recommended' } },
  es: { name: 'Español', tts: 'es', voices: { female: 'ef_dora', male: 'em_alex' }, ui: { swipe: 'Deslizá', recommended: 'Recomendado' } },
  fr: { name: 'Français', tts: 'fr-fr', voices: { female: 'ff_siwis', male: 'ff_siwis' }, ui: { swipe: 'Glissez', recommended: 'Recommandé' } },
  it: { name: 'Italiano', tts: 'it', voices: { female: 'if_sara', male: 'im_nicola' }, ui: { swipe: 'Scorri', recommended: 'Consigliato' } },
  'pt-BR': { name: 'Português (BR)', tts: 'pt-br', voices: { female: 'pf_dora', male: 'pm_alex' }, ui: { swipe: 'Deslize', recommended: 'Recomendado' } },
  hi: { name: 'हिन्दी', tts: 'hi', voices: { female: 'hf_alpha', male: 'hm_omega' }, ui: { swipe: 'स्वाइप करें', recommended: 'अनुशंसित' } },
  ja: { name: '日本語', tts: 'ja', voices: { female: 'jf_alpha', male: 'jm_kumo' }, ui: { swipe: 'スワイプ', recommended: 'おすすめ' } },
  zh: { name: '中文', tts: 'zh', voices: { female: 'zf_xiaobei', male: 'zm_yunjian' }, ui: { swipe: '滑动', recommended: '推荐' } },
};

// "es-AR" -> es, "pt" -> pt-BR, "en-US" -> en, "en-gb" -> en-GB. Unknown languages fall back to English settings
// for the UI strings; the voice must then be set explicitly in the plan.
export function lang(code = 'en') {
  const c = String(code).trim();
  const exact = Object.keys(LANGS).find((k) => k.toLowerCase() === c.toLowerCase());
  if (exact) return { code: exact, ...LANGS[exact] };
  const base = c.split(/[-_]/)[0].toLowerCase();
  const key = base === 'pt' ? 'pt-BR' : Object.keys(LANGS).find((k) => k === base);
  return key ? { code: key, ...LANGS[key] } : { code: c, ...LANGS.en, tts: null, known: false };
}

export const supported = () => Object.entries(LANGS).map(([code, l]) => `${code} (${l.name})`).join(', ');
