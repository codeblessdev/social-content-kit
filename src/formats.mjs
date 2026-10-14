// Sizes per platform. Any piece can override them with "size": [width, height].
export const FORMATS = {
  instagram: { post: [1080, 1350], square: [1080, 1080], carousel: [1080, 1350], story: [1080, 1920], reel: [1080, 1920] },
  youtube: { video: [1920, 1080], short: [1080, 1920], thumbnail: [1280, 720], community: [1080, 1080] },
  tiktok: { video: [1080, 1920], carousel: [1080, 1920] },
  linkedin: { post: [1080, 1350], square: [1080, 1080], carousel: [1080, 1350], video: [1080, 1920] },
  x: { post: [1600, 900], video: [1920, 1080] },
  facebook: { post: [1080, 1350], story: [1080, 1920], reel: [1080, 1920] },
};

// Safe area (px top, bottom) covered by each app's UI in vertical formats.
export const SAFE = {
  instagram: { reel: [220, 420], story: [220, 300] },
  tiktok: { video: [180, 480] },
  youtube: { short: [200, 420] },
  facebook: { reel: [220, 420], story: [220, 300] },
};

export function sizeFor(platform, piece) {
  if (Array.isArray(piece.size)) return piece.size;
  const p = FORMATS[platform] || FORMATS.instagram;
  const fallback = piece.type === 'video' ? (p.reel || p.video || p.short) : (p.post || p.square || Object.values(p)[0]);
  return p[piece.format] || fallback;
}
