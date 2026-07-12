// nihongo-quest 主程式：畫面切換 + 戰鬥流程 + 養成互動
(function () {
  'use strict';
  const E = window.NQEngine, A = window.NQAssets;
  const $ = sel => document.querySelector(sel);

  let S = null;          // 存檔
  let battle = null;     // 進行中的戰鬥狀態

  // ───────── 小音效（WebAudio 合成，無檔案）─────────
  let actx = null;
  function beep(freq, dur, type, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.06, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* 無音效環境 */ }
  }
  const sfx = {
    ok:      () => { beep(660, 0.08); setTimeout(() => beep(990, 0.12), 70); },
    bad:     () => beep(140, 0.3, 'sawtooth', 0.08),
    hit:     () => beep(220, 0.12, 'triangle', 0.1),
    special: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15), i * 80)); },
    win:     () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sine', 0.08), i * 120)); },
    feed:    () => beep(880, 0.1, 'sine', 0.08),
    levelup: () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sine', 0.09), i * 100)); },
  };

  // ───────── 畫面切換 ─────────
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('#' + id).classList.add('active');
  }

  // ───────── 標題 ─────────
  function renderTitle() {
    const box = $('#title-art'); box.innerHTML = '';
    box.appendChild(A.node('title', 'title-img'));
    const has = !!E.load();
    $('#btn-continue').style.display = has ? '' : 'none';
    show('screen-title');
  }

  // ───────── 夥伴之家 ─────────
  function renderHome(msg) {
    const st = E.petStats(S.level, S.affection);
    if (S.hp > st.maxHp) S.hp = st.maxHp;
    const evo = st.evo;

    const art = $('#home-pet'); art.innerHTML = '';
    art.appendChild(A.node(evo.img, 'pet-img'));

    $('#home-name').textContent = `${evo.name}`;
    $('#home-title').textContent = `Lv.${S.level} ・ ${evo.title}（第${evo.stage}型態）`;
    $('#home-hp').style.width = Math.max(0, S.hp / st.maxHp * 100) + '%';
    $('#home-hp-num').textContent = `${S.hp} / ${st.maxHp}`;
    const need = E.xpToNext(S.level);
    $('#home-xp').style.width = Math.min(100, S.xp / need * 100) + '%';
    $('#home-xp-num').textContent = `${S.xp} / ${need}`;
    $('#home-aff-num').textContent = '❤️'.repeat(Math.min(5, 1 + Math.floor(S.affection / 20))) + ` ${S.affection}`;
    $('#home-stats').textContent = `攻擊 ${st.atk}　防禦 ${st.def}`;

    // 食物列
    const inv = $('#home-inv'); inv.innerHTML = '';
    let any = false;
    Object.keys(E.FOODS).forEach(k => {
      const n = S.inv[k] || 0;
      if (!n) return;
      any = true;
      const f = E.FOODS[k];
      const b = document.createElement('button');
      b.className = 'food-btn';
      b.innerHTML = `<span class="food-emoji">${f.emoji}</span><span>${f.name} ×${n}</span>`;
      b.onclick = () => feed(k);
      inv.appendChild(b);
    });
    if (!any) inv.innerHTML = '<div class="dim">背包空空的…打贏戰鬥會掉食物！</div>';

    const wrongN = Object.keys(S.wrongs).length;
    $('#btn-review').textContent = wrongN ? `📖 復習戰（錯題 ×${wrongN}）` : '📖 復習戰（沒有錯題）';
    $('#btn-review').disabled = !wrongN;

    const acc = S.stats.total ? Math.round(S.stats.correct / S.stats.total * 100) : 0;
    $('#home-record').textContent =
      `戰鬥 ${S.stats.battles} 場 ・ 答題正確率 ${acc}% ・ 通關 ${Object.keys(S.cleared).length}/${E.STAGES.length}`;

    $('#home-msg').textContent = msg || tipOfHome();
    show('screen-home');
  }
  function tipOfHome() {
    const st = E.petStats(S.level, S.affection);
    if (S.hp < st.maxHp * 0.3) return 'コン受傷了…餵牠吃點東西吧！';
    if (S.level >= 9 && S.level < 10) return '快進化了！再打一場就差不多囉。';
    return pickTip();
  }
  const TIPS = ['答題越快傷害越高（4 秒內快答 ×1.4）', '連續答對 3 題會累滿必殺技！', '錯過的題目會變成復習戰的妖怪', '餵食提升好感度，好感度加攻擊力', '每週 BOSS 考文法，先把該週文法練熟'];
  function pickTip() { return TIPS[Math.floor(Math.random() * TIPS.length)]; }

  function feed(key) {
    const f = E.FOODS[key];
    if (!S.inv[key]) return;
    const st = E.petStats(S.level, S.affection);
    if (f.heal && S.hp >= st.maxHp && !f.xp && f.aff < 3) { renderHome('コン現在很健康，捨不得吃掉它！'); return; }
    S.inv[key]--; if (!S.inv[key]) delete S.inv[key];
    S.hp = Math.min(st.maxHp, S.hp + f.heal);
    S.affection = Math.min(100, S.affection + f.aff);
    if (f.xp) gainXp(f.xp);
    E.save(S);
    sfx.feed();
    renderHome(`コン吃了${f.name}！${f.heal >= 999 ? 'HP 全滿' : 'HP +' + f.heal}、好感 +${f.aff}${f.xp ? '、XP +' + f.xp : ''} 🦊`);
  }

  function gainXp(n) {
    S.xp += n;
    let leveled = false, evoBefore = E.evoOf(S.level).stage;
    while (S.xp >= E.xpToNext(S.level)) {
      S.xp -= E.xpToNext(S.level);
      S.level++;
      leveled = true;
    }
    if (leveled) {
      const st = E.petStats(S.level, S.affection);
      S.hp = st.maxHp; // 升級全滿
      const evoAfter = E.evoOf(S.level).stage;
      return { leveled, evolved: evoAfter > evoBefore };
    }
    return { leveled: false, evolved: false };
  }

  // ───────── 地圖 ─────────
  function renderMap() {
    const box = $('#map-regions'); box.innerHTML = '';
    E.REGIONS.forEach(r => {
      const card = document.createElement('div');
      card.className = 'region-card';
      const bgUrl = A.url(r.bg);
      card.style.backgroundImage = bgUrl ? `linear-gradient(rgba(10,8,20,.45), rgba(10,8,20,.72)), url(${bgUrl})` : A.grad(r.bg);

      const head = document.createElement('div');
      head.className = 'region-head';
      head.innerHTML = `<div class="region-name">第${r.week}週 ${r.name}</div><div class="region-sub">${r.sub}</div>`;
      card.appendChild(head);

      const row = document.createElement('div');
      row.className = 'stage-row';
      E.STAGES.filter(s => s.week === r.week).forEach(s => {
        const b = document.createElement('button');
        const unlocked = E.isUnlocked(s.id, S);
        const cleared = !!S.cleared[s.id];
        b.className = 'stage-node' + (s.kind === 'boss' ? ' boss' : '') + (cleared ? ' cleared' : '') + (unlocked ? '' : ' locked');
        b.innerHTML = s.kind === 'boss' ? '👑' : (cleared ? '⭐' : (unlocked ? s.day : '🔒'));
        b.title = s.name;
        if (unlocked) b.onclick = () => startBattle(s);
        row.appendChild(b);
      });
      card.appendChild(row);

      // 顯示目前進度提示
      const cur = E.STAGES.filter(s => s.week === r.week).find(s => E.isUnlocked(s.id, S) && !S.cleared[s.id]);
      const tail = document.createElement('div');
      tail.className = 'region-tail';
      tail.textContent = cur ? `▶ ${cur.kind === 'boss' ? cur.name : 'Day' + cur.day + '：' + cur.name}` :
        (E.isUnlocked(`w${r.week}d1`, S) ? '✅ 全部通關！' : '尚未解鎖');
      card.appendChild(tail);
      box.appendChild(card);
    });
    show('screen-map');
  }

  // ───────── 戰鬥 ─────────
  function startBattle(stage) {
    const petSt = E.petStats(S.level, S.affection);
    if (S.hp <= 0) S.hp = Math.round(petSt.maxHp * 0.3); // 保底
    const isReview = stage === 'review';
    let enemy, qs, stageObj;
    if (isReview) {
      const n = Object.keys(S.wrongs).length;
      enemy = E.reviewEnemy(n);
      qs = E.buildReviewSet(S.wrongs, Math.min(10, Math.max(6, n)));
      stageObj = { id: 'review', kind: 'review', name: '復習戰', questions: qs.length,
        region: { bg: 'bg_w4' }, enemy: { name: '錯題百目鬼', img: 'enemy_review', hue: 0 } };
    } else {
      enemy = E.enemyStats(stage);
      qs = E.buildQuestionSet(stage, S.wrongs);
      stageObj = stage;
    }
    battle = {
      stage: stageObj, qs, qi: 0,
      petHp: S.hp, petMax: petSt.maxHp, petAtk: petSt.atk, petDef: petSt.def,
      eHp: enemy.maxHp, eMax: enemy.maxHp, eAtk: enemy.atk, eLv: enemy.lv,
      combo: 0, gauge: 0, correct: 0, answered: 0,
      t0: 0, timer: null, locked: false,
    };
    renderBattleScene();
    nextQuestion();
    show('screen-battle');
  }

  function renderBattleScene() {
    const b = battle, stage = b.stage;
    const bgUrl = A.url(stage.region.bg);
    const scene = $('#battle-scene');
    scene.style.backgroundImage = bgUrl ? `linear-gradient(rgba(8,6,18,.35), rgba(8,6,18,.55)), url(${bgUrl})` : A.grad(stage.region.bg);

    $('#battle-stage-name').textContent = stage.kind === 'review' ? '📖 復習戰' :
      `第${stage.week}週 ${stage.kind === 'boss' ? '' : 'Day' + stage.day + '・'}${stage.name}`;

    const pa = $('#battle-pet-art'); pa.innerHTML = '';
    pa.appendChild(A.node(E.evoOf(S.level).img, 'fighter-img'));
    $('#battle-pet-name').textContent = `${E.evoOf(S.level).name} Lv.${S.level}`;

    const ea = $('#battle-enemy-art'); ea.innerHTML = '';
    const en = A.node(stage.enemy.img, 'fighter-img');
    if (stage.enemy.hue) en.style.filter = `hue-rotate(${stage.enemy.hue}deg)`;
    ea.appendChild(en);
    $('#battle-enemy-name').textContent = `${stage.enemy.name} Lv.${b.eLv}`;
    updateBars();
  }

  function updateBars() {
    const b = battle;
    $('#battle-pet-hp').style.width = Math.max(0, b.petHp / b.petMax * 100) + '%';
    $('#battle-pet-hp-num').textContent = `${Math.max(0, b.petHp)}/${b.petMax}`;
    $('#battle-enemy-hp').style.width = Math.max(0, b.eHp / b.eMax * 100) + '%';
    $('#battle-enemy-hp-num').textContent = `${Math.max(0, b.eHp)}/${b.eMax}`;
    $('#battle-combo').textContent = b.combo >= 2 ? `🔥 ${b.combo} 連擊！` : '';
    const g = Math.min(100, b.gauge);
    $('#battle-gauge').style.width = g + '%';
    $('#battle-gauge-label').textContent = g >= 100 ? '⚡ 必殺技就緒！' : '必殺技';
  }

  const Q_TIME = 15000, FAST_MS = 4000;
  function nextQuestion() {
    const b = battle;
    if (b.eHp <= 0 || b.petHp <= 0 || b.qi >= b.qs.length) return endBattle();
    const q = b.qs[b.qi];
    b.locked = false;
    $('#q-num').textContent = `第 ${b.qi + 1} / ${b.qs.length} 題`;
    $('#q-type').textContent = q.qtype === 'kana' ? '假名' : q.qtype === 'grammar' ? '文法' : '單字';
    $('#q-prompt').textContent = q.prompt;
    $('#q-sub').textContent = q.promptSub + (q.hint ? `（提示：${q.hint}）` : '');
    $('#q-feedback').textContent = ''; $('#q-feedback').className = 'q-feedback';
    const box = $('#q-choices'); box.innerHTML = '';
    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.onclick = () => answer(i);
      box.appendChild(btn);
    });
    // 計時條
    b.t0 = Date.now();
    const bar = $('#q-timer');
    bar.style.transition = 'none'; bar.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${Q_TIME}ms linear`; bar.style.width = '0%';
    }));
    clearTimeout(b.timer);
    b.timer = setTimeout(() => answer(-1), Q_TIME);
  }

  function answer(i) {
    const b = battle;
    if (b.locked) return;
    b.locked = true;
    clearTimeout(b.timer);
    const q = b.qs[b.qi];
    const elapsed = Date.now() - b.t0;
    const correct = i === q.ans;
    b.answered++; S.stats.total++;

    // 標示按鈕
    document.querySelectorAll('.choice-btn').forEach((btn, bi) => {
      btn.disabled = true;
      if (bi === q.ans) btn.classList.add('right');
      else if (bi === i) btn.classList.add('wrong');
    });

    const fb = $('#q-feedback');
    if (correct) {
      b.correct++; S.stats.correct++;
      b.combo++;
      const fast = elapsed < FAST_MS;
      const special = b.gauge >= 100;
      if (special) b.gauge = 0; else b.gauge += 34;
      const dmg = E.petDamage(b.petAtk, b.combo, fast, special);
      b.eHp -= dmg;
      // 答對兩次後從錯題本移除
      if (S.wrongs[q.wrongKey]) {
        S.wrongs[q.wrongKey]--;
        if (S.wrongs[q.wrongKey] <= 0) delete S.wrongs[q.wrongKey];
      }
      fb.textContent = `⭕ ${q.exp}`;
      fb.className = 'q-feedback good';
      if (special) { sfx.special(); flashScene('special'); popDamage('#battle-enemy-art', dmg, true, '⚡必殺'); }
      else { sfx.ok(); popDamage('#battle-enemy-art', dmg, fast, fast ? '快答!' : ''); }
      shake('#battle-enemy-art');
    } else {
      b.combo = 0; b.gauge = Math.max(0, b.gauge - 20);
      S.wrongs[q.wrongKey] = (S.wrongs[q.wrongKey] || 0) + 2; // 需答對兩次才消
      const dmg = E.enemyDamage(b.eAtk, b.petDef);
      b.petHp -= dmg;
      fb.textContent = `${i === -1 ? '⏰ 時間到！' : '❌'} 正解：${q.choices[q.ans]}　${q.exp}`;
      fb.className = 'q-feedback bad';
      sfx.bad();
      setTimeout(() => { sfx.hit(); shake('#battle-pet-art'); popDamage('#battle-pet-art', dmg, false, ''); }, 300);
    }
    updateBars();
    b.qi++;
    const wait = correct ? 1100 : 2600; // 答錯多看一下解說
    setTimeout(nextQuestion, wait);
  }

  function popDamage(sel, dmg, big, tag) {
    const host = $(sel);
    const el = document.createElement('div');
    el.className = 'dmg-pop' + (big ? ' big' : '');
    el.textContent = (tag ? tag + ' ' : '') + '-' + dmg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  function shake(sel) {
    const el = $(sel);
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }
  function flashScene(cls) {
    const sc = $('#battle-scene');
    sc.classList.remove(cls); void sc.offsetWidth; sc.classList.add(cls);
  }

  // ───────── 結算 ─────────
  function endBattle() {
    const b = battle;
    clearTimeout(b.timer);
    const win = b.eHp <= 0;
    const stage = b.stage;
    S.hp = Math.max(0, b.petHp);
    S.stats.battles++;

    let lines = [];
    let evolved = false, leveled = false;
    if (win) {
      sfx.win();
      const perfect = b.correct === b.answered;
      if (stage.kind === 'review') {
        S.stats.reviews++;
        lines.push(`復習完成！剩餘錯題 ${Object.keys(S.wrongs).length} 個`);
        var xp = Math.round(20 + b.correct * 4);
      } else {
        if (!S.cleared[stage.id]) S.cleared[stage.id] = { at: Date.now() };
        S.cleared[stage.id].best = Math.max(S.cleared[stage.id].best || 0, Math.round(b.correct / b.answered * 100));
        var xp = E.xpReward(stage, b.correct, b.answered);
        const loot = E.rollLoot(stage, perfect);
        Object.keys(loot).forEach(k => {
          S.inv[k] = (S.inv[k] || 0) + loot[k];
          lines.push(`獲得 ${E.FOODS[k].emoji} ${E.FOODS[k].name} ×${loot[k]}`);
        });
        if (perfect) lines.unshift('🌟 全問正解！額外獎勵！');
      }
      const g = gainXp(xp);
      leveled = g.leveled; evolved = g.evolved;
      lines.unshift(`XP +${xp}`);
    } else {
      lines.push('コン倒下了…回家餵點食物，或去復習戰練功吧！');
      const g = gainXp(Math.round(5 + b.correct * 2));
      leveled = g.leveled; evolved = g.evolved;
      lines.unshift(`XP +${Math.round(5 + b.correct * 2)}（雖敗猶榮）`);
    }
    E.save(S);

    $('#result-title').textContent = win ? (stage.kind === 'boss' ? '👑 BOSS 擊破！' : '🎉 勝利！') : '💤 敗北…';
    $('#result-title').className = win ? 'result-win' : 'result-lose';
    $('#result-acc').textContent = `答對 ${b.correct} / ${b.answered} 題`;
    $('#result-lines').innerHTML = lines.map(l => `<div>${l}</div>`).join('');

    const evoBox = $('#result-evo'); evoBox.innerHTML = '';
    if (evolved) {
      sfx.levelup();
      const evo = E.evoOf(S.level);
      evoBox.innerHTML = `<div class="evo-banner">✨ 進化！${evo.name}——${evo.title}！✨</div>`;
      const art = A.node(evo.img, 'pet-img evo-art');
      evoBox.appendChild(art);
    } else if (leveled) {
      sfx.levelup();
      evoBox.innerHTML = `<div class="evo-banner small">⬆️ 升級！Lv.${S.level}</div>`;
    }

    // 下一關按鈕
    const nextBtn = $('#btn-next-stage');
    let next = null;
    if (win && stage.kind !== 'review') {
      const i = E.stageIndex(stage.id);
      if (i >= 0 && i + 1 < E.STAGES.length) next = E.STAGES[i + 1];
    }
    if (next && E.isUnlocked(next.id, S) && S.hp > 0) {
      nextBtn.style.display = '';
      nextBtn.textContent = next.kind === 'boss' ? `👑 挑戰 ${next.name}` : `▶ 下一關 Day${next.day}：${next.name}`;
      nextBtn.onclick = () => startBattle(next);
    } else nextBtn.style.display = 'none';

    battle = null;
    show('screen-result');
  }

  // ───────── 綁定 ─────────
  function bind() {
    $('#btn-new').onclick = () => {
      if (E.load() && !confirm('確定要重新開始嗎？現有進度會被刪除！')) return;
      E.wipe(); S = E.newSave(); E.save(S); renderHome('コン加入了你的旅程！先從「挨拶の町」出發吧 🦊');
    };
    $('#btn-continue').onclick = () => { S = E.load() || E.newSave(); renderHome(); };
    $('#btn-go-map').onclick = () => renderMap();
    $('#btn-review').onclick = () => startBattle('review');
    $('#btn-map-back').onclick = () => renderHome();
    $('#btn-result-home').onclick = () => renderHome();
    $('#btn-result-map').onclick = () => renderMap();
    $('#btn-battle-flee').onclick = () => {
      if (!battle) return;
      if (confirm('要逃跑嗎？本場不會有獎勵。')) { battle.petHp = Math.max(1, battle.petHp); battle.eHp = 1e9; clearTimeout(battle.timer); S.hp = battle.petHp; E.save(S); battle = null; renderMap(); }
    };
    $('#btn-home-title').onclick = () => renderTitle();
  }

  // ───────── 啟動 ─────────
  window.NQ = { // 測試掛鉤：隱藏分頁下可手動驅動
    state: () => S, battle: () => battle,
    startStage: id => startBattle(id === 'review' ? 'review' : E.stageById(id)),
    answer: i => answer(i),
    cheat: { xp: n => { gainXp(n); E.save(S); renderHome(); } },
  };
  A.preload().then(() => {
    bind();
    renderTitle();
  });
})();
