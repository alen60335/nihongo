// nihongo-quest 素材層：有圖用圖、缺圖用 emoji 佔位
// 圖片由本機 SD Forge (AOM3A3) 生成，放 assets/img/ 即自動生效
window.NQAssets = (function () {
  // 使用者回饋：AI 生成的角色/妖怪立繪不好看——只保留背景圖，
  // 角色與敵人一律用漸層＋emoji 卡片（noimg: 不發請求直接用佔位樣式）
  const MANIFEST = {
    title:        { src: 'assets/img/bg_w4.png',        emoji: '🏯', grad: ['#1f2b52', '#c86bd6'] },
    pet_1:        { noimg: true, emoji: '🦊', grad: ['#ffe9c9', '#ffb36b'] },
    pet_2:        { noimg: true, emoji: '🦊', grad: ['#ffd9a0', '#ff8f4f'] },
    pet_3:        { noimg: true, emoji: '🦊', grad: ['#fff2d0', '#ffcf5e'] },
    bg_w1:        { src: 'assets/img/bg_w1.png',        emoji: '⛩️', grad: ['#f7b2c4', '#7a5fb5'] },
    bg_w2:        { src: 'assets/img/bg_w2.png',        emoji: '🏮', grad: ['#3b2033', '#e0653a'] },
    bg_w3:        { src: 'assets/img/bg_w3.png',        emoji: '🚉', grad: ['#274b6d', '#88b7d5'] },
    bg_w4:        { src: 'assets/img/bg_w4.png',        emoji: '🏯', grad: ['#1f2b52', '#c86bd6'] },
    enemy_w1:     { noimg: true, emoji: '🐦‍⬛', grad: ['#4a3d63', '#8d7bb5'] },
    boss_w1:      { noimg: true, emoji: '👺', grad: ['#3d2b52', '#b5533c'] },
    enemy_w2:     { noimg: true, emoji: '🥒', grad: ['#28503c', '#63a375'] },
    boss_w2:      { noimg: true, emoji: '🦝', grad: ['#4d3320', '#b58a4f'] },
    enemy_w3:     { noimg: true, emoji: '🏮', grad: ['#2e3a55', '#6f89b5'] },
    boss_w3:      { noimg: true, emoji: '🐉', grad: ['#22314d', '#4fb5a0'] },
    enemy_w4:     { noimg: true, emoji: '🔥', grad: ['#33224d', '#7d5fd0'] },
    boss_w4:      { noimg: true, emoji: '👹', grad: ['#26123d', '#d0455f'] },
    enemy_review: { noimg: true, emoji: '📖', grad: ['#3a3a4a', '#9088c0'] },
  };

  const state = {}; // key -> 'ok' | 'missing'

  function preload() {
    return Promise.all(Object.keys(MANIFEST).map(key => new Promise(res => {
      const m = MANIFEST[key];
      if (m.noimg) { state[key] = 'missing'; return res(); }
      const im = new Image();
      im.onload = () => { state[key] = 'ok'; res(); };
      im.onerror = () => { state[key] = 'missing'; res(); };
      im.src = m.src;
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
