// nihongo-quest 素材層：有圖用圖、缺圖用 emoji 佔位
// 圖片由本機 SD Forge (AOM3A3) 生成，放 assets/img/ 即自動生效
window.NQAssets = (function () {
  const MANIFEST = {
    title:        { src: 'assets/img/title.png',        emoji: '🦊', grad: ['#2b1d4f', '#e2547a'] },
    pet_1:        { src: 'assets/img/pet_1.png',        emoji: '🦊', grad: ['#ffe9c9', '#ffb36b'] },
    pet_2:        { src: 'assets/img/pet_2.png',        emoji: '🦊', grad: ['#ffd9a0', '#ff8f4f'] },
    pet_3:        { src: 'assets/img/pet_3.png',        emoji: '🦊', grad: ['#fff2d0', '#ffcf5e'] },
    bg_w1:        { src: 'assets/img/bg_w1.png',        emoji: '⛩️', grad: ['#f7b2c4', '#7a5fb5'] },
    bg_w2:        { src: 'assets/img/bg_w2.png',        emoji: '🏮', grad: ['#3b2033', '#e0653a'] },
    bg_w3:        { src: 'assets/img/bg_w3.png',        emoji: '🚉', grad: ['#274b6d', '#88b7d5'] },
    bg_w4:        { src: 'assets/img/bg_w4.png',        emoji: '🏯', grad: ['#1f2b52', '#c86bd6'] },
    enemy_w1:     { src: 'assets/img/enemy_w1.png',     emoji: '🐦‍⬛', grad: ['#4a3d63', '#8d7bb5'] },
    boss_w1:      { src: 'assets/img/boss_w1.png',      emoji: '👺', grad: ['#3d2b52', '#b5533c'] },
    enemy_w2:     { src: 'assets/img/enemy_w2.png',     emoji: '🥒', grad: ['#28503c', '#63a375'] },
    boss_w2:      { src: 'assets/img/boss_w2.png',      emoji: '🦝', grad: ['#4d3320', '#b58a4f'] },
    enemy_w3:     { src: 'assets/img/enemy_w3.png',     emoji: '🏮', grad: ['#2e3a55', '#6f89b5'] },
    boss_w3:      { src: 'assets/img/boss_w3.png',      emoji: '🐉', grad: ['#22314d', '#4fb5a0'] },
    enemy_w4:     { src: 'assets/img/enemy_w4.png',     emoji: '🔥', grad: ['#33224d', '#7d5fd0'] },
    boss_w4:      { src: 'assets/img/boss_w4.png',      emoji: '👹', grad: ['#26123d', '#d0455f'] },
    enemy_review: { src: 'assets/img/enemy_review.png', emoji: '📖', grad: ['#3a3a4a', '#9088c0'] },
  };

  const state = {}; // key -> 'ok' | 'missing'

  function preload() {
    return Promise.all(Object.keys(MANIFEST).map(key => new Promise(res => {
      const im = new Image();
      im.onload = () => { state[key] = 'ok'; res(); };
      im.onerror = () => { state[key] = 'missing'; res(); };
      im.src = MANIFEST[key].src;
    })));
  }

  // 回傳可直接塞進容器的節點：圖片或漸層+emoji 佔位
  function node(key, cls) {
    const m = MANIFEST[key];
    const wrap = document.createElement('div');
    wrap.className = 'asset ' + (cls || '');
    if (state[key] === 'ok') {
      const im = document.createElement('img');
      im.src = m.src; im.alt = key; im.draggable = false;
      wrap.appendChild(im);
    } else {
      wrap.style.background = `linear-gradient(160deg, ${m.grad[0]}, ${m.grad[1]})`;
      const em = document.createElement('div');
      em.className = 'asset-emoji';
      em.textContent = m.emoji;
      wrap.appendChild(em);
    }
    return wrap;
  }

  function url(key) { return state[key] === 'ok' ? MANIFEST[key].src : null; }
  function grad(key) { const m = MANIFEST[key]; return `linear-gradient(160deg, ${m.grad[0]}, ${m.grad[1]})`; }

  return { MANIFEST, preload, node, url, grad };
})();
