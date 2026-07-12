// nihongo-quest 純邏輯引擎：出題、戰鬥數值、養成成長、關卡表
// 不碰 DOM，依賴 data.js 的全域 HIRA/KATA/VDB/GDB
window.NQEngine = (function () {
  'use strict';

  // ───────── 工具 ─────────
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sampleOthers(pool, n, excludeFn) {
    return shuffle(pool.filter(x => !excludeFn(x))).slice(0, n);
  }

  const KANA_ALL = HIRA.concat(KATA).filter(k => k[0]);
  const ALL_WORDS = VDB.flatMap(d => d.words);

  // ───────── 關卡表 ─────────
  // 4 週 = 4 地區；每週 7 天關 + 1 文法 BOSS 關
  const REGIONS = [
    { week: 1, name: '挨拶の町',   sub: '問候之町', bg: 'bg_w1',
      minion: { name: '迷路烏鴉',   img: 'enemy_w1' }, boss: { name: '烏天狗・カア', img: 'boss_w1' } },
    { week: 2, name: '美食横丁',   sub: '美食橫丁', bg: 'bg_w2',
      minion: { name: '貪吃河童',   img: 'enemy_w2' }, boss: { name: '大胃王狸長',   img: 'boss_w2' } },
    { week: 3, name: '旅路の駅',   sub: '旅途車站', bg: 'bg_w3',
      minion: { name: '提燈小僧',   img: 'enemy_w3' }, boss: { name: '誤點蒼龍',     img: 'boss_w3' } },
    { week: 4, name: '言葉の城',   sub: '言靈之城', bg: 'bg_w4',
      minion: { name: '言靈鬼火',   img: 'enemy_w4' }, boss: { name: '言靈大天狗',   img: 'boss_w4' } },
  ];

  function buildStages() {
    const stages = [];
    REGIONS.forEach(r => {
      for (let d = 1; d <= 7; d++) {
        const vday = VDB.find(v => v.week === r.week && v.day === d);
        stages.push({
          id: `w${r.week}d${d}`, week: r.week, day: d, kind: 'day',
          name: vday.theme, region: r,
          enemy: { name: `${r.minion.name}`, img: r.minion.img, hue: (d - 1) * 40 },
          questions: 8,
        });
      }
      stages.push({
        id: `w${r.week}boss`, week: r.week, day: 8, kind: 'boss',
        name: `BOSS：${r.boss.name}`, region: r,
        enemy: { name: r.boss.name, img: r.boss.img, hue: 0 },
        questions: 10,
      });
    });
    return stages;
  }
  const STAGES = buildStages();
  function stageById(id) { return STAGES.find(s => s.id === id); }
  function stageIndex(id) { return STAGES.findIndex(s => s.id === id); }

  // ───────── 出題 ─────────
  // q 格式：{ qtype, prompt, promptSub, hint, choices[4], ans, exp, wrongKey }
  function vocabQuestion(day, wordOverride) {
    const w = wordOverride || pick(day.words);
    const mode = pick(['jp2zh', 'zh2jp', 'rd2jp']);
    // 干擾項優先取同天單字，不足補全庫
    let pool = day.words.filter(x => x.jp !== w.jp);
    if (pool.length < 3) pool = pool.concat(ALL_WORDS.filter(x => x.jp !== w.jp));
    const others = sampleOthers(pool, 3, () => false);
    let prompt, promptSub, choicesRaw, fmt;
    if (mode === 'jp2zh') {
      prompt = w.jp; promptSub = '這個詞是什麼意思？';
      fmt = x => x.zh;
    } else if (mode === 'zh2jp') {
      prompt = w.zh; promptSub = '日文怎麼說？';
      fmt = x => x.jp;
    } else {
      prompt = w.rd; promptSub = '這個讀音是哪個詞？';
      fmt = x => x.jp;
    }
    choicesRaw = shuffle([w].concat(others));
    return {
      qtype: 'vocab',
      prompt, promptSub,
      choices: choicesRaw.map(fmt),
      ans: choicesRaw.indexOf(w),
      exp: `${w.jp}（${w.rd}）＝ ${w.zh}`,
      wrongKey: 'v:' + w.jp,
    };
  }

  function kanaQuestion(pairOverride) {
    const k = pairOverride || pick(KANA_ALL);
    const toRomaji = Math.random() < 0.5;
    // 干擾項取羅馬音相近（同行/同段優先）→ 隨機補足
    const others = sampleOthers(KANA_ALL, 3, x => x[0] === k[0] || x[1] === k[1]);
    const raw = shuffle([k].concat(others));
    return {
      qtype: 'kana',
      prompt: toRomaji ? k[0] : k[1],
      promptSub: toRomaji ? '這個假名怎麼唸？' : '哪個是這個讀音的假名？',
      choices: raw.map(x => toRomaji ? x[1] : x[0]),
      ans: raw.indexOf(k),
      exp: `${k[0]} 唸作「${k[1]}」`,
      wrongKey: 'k:' + k[0],
    };
  }

  function grammarQuestion(week, quizOverride) {
    let g, qz;
    if (quizOverride) { g = quizOverride.g; qz = quizOverride.qz; }
    else {
      g = pick(GDB.filter(x => x.week === week));
      qz = pick(g.quizzes);
    }
    return {
      qtype: 'grammar',
      prompt: qz.q,
      promptSub: `文法：${g.title}（${g.sub}）`,
      hint: qz.hint,
      choices: qz.choices,
      ans: qz.ans,
      exp: qz.exp || g.note,
      wrongKey: 'g:' + g.id + ':' + qz.q,
    };
  }

  // 依 wrongKey 還原題目（復習戰用）
  function questionFromWrongKey(key) {
    if (key.startsWith('v:')) {
      const jp = key.slice(2);
      const w = ALL_WORDS.find(x => x.jp === jp);
      if (!w) return null;
      const day = VDB.find(d => d.words.some(x => x.jp === jp));
      return vocabQuestion(day, w);
    }
    if (key.startsWith('k:')) {
      const ch = key.slice(2);
      const k = KANA_ALL.find(x => x[0] === ch);
      return k ? kanaQuestion(k) : null;
    }
    if (key.startsWith('g:')) {
      const [, gid, q] = key.split(':');
      const g = GDB.find(x => x.id === gid);
      if (!g) return null;
      const qz = g.quizzes.find(x => x.q === q) || pick(g.quizzes);
      return grammarQuestion(g.week, { g, qz });
    }
    return null;
  }

  // 一場戰鬥的題目序列
  function buildQuestionSet(stage, wrongs) {
    const qs = [];
    const day = stage.kind === 'day' ? VDB.find(v => v.week === stage.week && v.day === stage.day) : null;
    const wrongKeys = Object.keys(wrongs || {});
    for (let i = 0; i < stage.questions; i++) {
      const r = Math.random();
      if (stage.kind === 'boss') {
        // BOSS：60% 本週文法、30% 本週單字、10% 錯題
        if (r < 0.6) qs.push(grammarQuestion(stage.week));
        else if (r < 0.9 || !wrongKeys.length) {
          const wday = pick(VDB.filter(v => v.week === stage.week));
          qs.push(vocabQuestion(wday));
        } else qs.push(questionFromWrongKey(pick(wrongKeys)) || vocabQuestion(pick(VDB)));
      } else {
        // 日常關：主打當日單字；第 1 週摻假名；已解鎖日子摻復習
        const kanaRate = stage.week === 1 ? 0.25 : 0.1;
        if (r < kanaRate) qs.push(kanaQuestion());
        else if (r < kanaRate + 0.12 && wrongKeys.length) {
          qs.push(questionFromWrongKey(pick(wrongKeys)) || vocabQuestion(day));
        } else qs.push(vocabQuestion(day));
      }
    }
    return qs;
  }

  function buildReviewSet(wrongs, n) {
    const keys = shuffle(Object.keys(wrongs || {}));
    const qs = [];
    for (let i = 0; i < Math.min(n, keys.length); i++) {
      const q = questionFromWrongKey(keys[i]);
      if (q) qs.push(q);
    }
    while (qs.length < Math.min(n, 6)) qs.push(vocabQuestion(pick(VDB)));
    return qs;
  }

  // ───────── 養成數值 ─────────
  const EVOS = [
    { minLv: 1,  img: 'pet_1', name: '子狐コン',   title: '見習旅伴' },
    { minLv: 10, img: 'pet_2', name: '妖狐コン',   title: '言葉的使者' },
    { minLv: 25, img: 'pet_3', name: '九尾コンノスケ', title: '言靈守護神' },
  ];
  function evoOf(level) {
    for (let i = EVOS.length - 1; i >= 0; i--) if (level >= EVOS[i].minLv) return { ...EVOS[i], stage: i + 1 };
    return { ...EVOS[0], stage: 1 };
  }
  function xpToNext(level) { return 30 + level * 22; }
  function petStats(level, affection) {
    const evo = evoOf(level);
    const evoMul = 1 + (evo.stage - 1) * 0.15;
    const affMul = 1 + Math.min(affection || 0, 100) * 0.003; // 好感度最多 +30%
    return {
      maxHp: Math.round((80 + level * 14) * evoMul),
      atk: Math.round((12 + level * 2.4) * evoMul * affMul),
      def: Math.round((3 + level * 1.2) * evoMul),
      evo,
    };
  }

  function enemyStats(stage) {
    const idx = stageIndex(stage.id); // 0..31
    const bossMul = stage.kind === 'boss' ? 1.7 : 1;
    return {
      maxHp: Math.round((70 + idx * 34) * bossMul),
      atk: Math.round((10 + idx * 2.6) * bossMul),
      lv: idx + 1 + (stage.kind === 'boss' ? 2 : 0),
    };
  }
  function reviewEnemy(wrongCount) {
    const n = Math.min(wrongCount, 20);
    return { maxHp: 60 + n * 22, atk: 8 + n * 1.5, lv: Math.max(3, n) };
  }

  // ───────── 戰鬥計算 ─────────
  // 答對傷害：ATK ×(1+0.2×連擊) ×快答1.4 ×必殺2.4 ×浮動0.9~1.1
  function petDamage(atk, combo, fast, special) {
    let d = atk * (1 + 0.2 * Math.min(combo, 5));
    if (fast) d *= 1.4;
    if (special) d *= 2.4;
    return Math.round(d * (0.9 + Math.random() * 0.2));
  }
  function enemyDamage(eAtk, def) {
    return Math.max(3, Math.round((eAtk - def * 0.5) * (0.9 + Math.random() * 0.2)));
  }

  // 戰利品：食物掉落
  const FOODS = {
    onigiri:  { name: 'おにぎり',   emoji: '🍙', heal: 30,  aff: 1, xp: 0 },
    takoyaki: { name: 'たこやき',   emoji: '🐙', heal: 55,  aff: 2, xp: 0 },
    ramen:    { name: 'ラーメン',   emoji: '🍜', heal: 999, aff: 3, xp: 0 },
    dango:    { name: 'おだんご',   emoji: '🍡', heal: 15,  aff: 5, xp: 10 },
  };
  function rollLoot(stage, perfect) {
    const loot = {};
    const add = k => loot[k] = (loot[k] || 0) + 1;
    add(pick(['onigiri', 'onigiri', 'takoyaki', 'dango']));
    if (stage.kind === 'boss') { add('ramen'); add('dango'); }
    if (perfect) add(pick(['takoyaki', 'dango']));
    return loot;
  }
  function xpReward(stage, correct, total) {
    const base = stage.kind === 'boss' ? 60 : 30;
    return Math.round(base * (0.5 + 0.5 * (correct / total)) + stageIndex(stage.id) * 2);
  }

  // ───────── 存檔 ─────────
  const SAVE_KEY = 'nq_save_v1';
  function newSave() {
    return {
      level: 1, xp: 0, affection: 0, hp: petStats(1, 0).maxHp,
      cleared: {},            // stageId -> {stars, best}
      wrongs: {},             // wrongKey -> 錯誤次數
      inv: { onigiri: 2 },    // 食物庫存
      stats: { battles: 0, correct: 0, total: 0, reviews: 0 },
      createdAt: Date.now(), updatedAt: Date.now(),
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return Object.assign(newSave(), s);
    } catch (e) { return null; }
  }
  function save(s) {
    s.updatedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  }
  function wipe() { localStorage.removeItem(SAVE_KEY); }

  // 關卡解鎖：第一關永遠開；其餘需前一關通關
  function isUnlocked(stageId, saveData) {
    const i = stageIndex(stageId);
    if (i === 0) return true;
    return !!saveData.cleared[STAGES[i - 1].id];
  }

  return {
    REGIONS, STAGES, EVOS, FOODS,
    stageById, stageIndex, isUnlocked,
    buildQuestionSet, buildReviewSet, questionFromWrongKey,
    petStats, enemyStats, reviewEnemy, evoOf, xpToNext,
    petDamage, enemyDamage, rollLoot, xpReward,
    newSave, load, save, wipe,
    _t: { shuffle, pick, vocabQuestion, kanaQuestion, grammarQuestion },
  };
})();
