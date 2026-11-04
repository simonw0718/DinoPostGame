// 郵票貼字母（原名字母送信→字母郵票貼貼樂，導演 2026-11-04 再改名；2026-11-03 拼字教學設計）：一格一個音的郵票（切字規則與難度 1–5 在 spell-words.js），開始畫面選模式與難度：
//   A 聽聲音：不出字母，依序點格子聽一個個聲音（拆音），最後才露出字母
//   B 選字母：看圖聽字，依序點字母郵票；點錯念出那張的聲音，再念這一格要的聲音
//   C 換字母：上一個字已經拼好（cat），聽新字（hat）先點「變了的那一格」，再選新字母
//   D 聽寫：不給圖，郵票多、格子不給提示；停 6 秒會讓對的郵票發光（算有提示）
//   自動：依每個字的熟練度 0–3 出 A／B／B／D
// 每放一個字母念它的「聲音」（assets/audio/phonics/）；拼好後示範拼讀（一格一格念聲音，再念整個字）。不限時。
// 熟練度存在本機：A 做完至少 1；B／C／D 一次拼對升一級、拼錯或用提示降一級；出題先挑熟練度低的字。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduced ? 0 : ms));
  const settle = (anim, ms) => Promise.race([anim.finished, wait(ms)]);

  const uiReadings = {
    '郵票貼字母': ['ㄧㄡˊ', 'ㄆㄧㄠˋ', 'ㄊㄧㄝ', 'ㄗˋ', 'ㄇㄨˇ'],
    '點一下，開始拼英文！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄆㄧㄣ', 'ㄧㄥ', 'ㄨㄣˊ', ''],
    '聽聲音，選字母': ['ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ', '', 'ㄒㄩㄢˇ', 'ㄗˋ', 'ㄇㄨˇ'],
    '點格子，聽聲音': ['ㄉㄧㄢˇ', 'ㄍㄜˊ', 'ㄗ˙', '', 'ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ'],
    '哪一個聲音變了？': ['ㄋㄚˇ', 'ㄧ', 'ㄍㄜ˙', 'ㄕㄥ', 'ㄧㄣ', 'ㄅㄧㄢˋ', 'ㄌㄜ˙', ''],
    '這個聲音沒有變': ['ㄓㄜˋ', 'ㄍㄜ˙', 'ㄕㄥ', 'ㄧㄣ', 'ㄇㄟˊ', 'ㄧㄡˇ', 'ㄅㄧㄢˋ'],
    '換成哪一個？': ['ㄏㄨㄢˋ', 'ㄔㄥˊ', 'ㄋㄚˇ', 'ㄧ', 'ㄍㄜ˙', ''],
    '聽一聽，拼出來': ['ㄊㄧㄥ', 'ㄧ', 'ㄊㄧㄥ', '', 'ㄆㄧㄣ', 'ㄔㄨ', 'ㄌㄞˊ'],
    '不是這個喔': ['ㄅㄨˊ', 'ㄕˋ', 'ㄓㄜˋ', 'ㄍㄜ˙', 'ㄛ'],
    '對了！': ['ㄉㄨㄟˋ', 'ㄌㄜ˙', ''],
    '拼好了！': ['ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '全部拼好了！': ['ㄑㄩㄢˊ', 'ㄅㄨˋ', 'ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '自動': ['ㄗˋ', 'ㄉㄨㄥˋ'], '聽聲音': ['ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ'], '選字母': ['ㄒㄩㄢˇ', 'ㄗˋ', 'ㄇㄨˇ'],
    '填空': ['ㄊㄧㄢˊ', 'ㄎㄨㄥˋ'], '缺哪一個字母？': ['ㄑㄩㄝ', 'ㄋㄚˇ', 'ㄧˊ', 'ㄍㄜˋ', 'ㄗˋ', 'ㄇㄨˇ', ''], '聽寫': ['ㄊㄧㄥ', 'ㄒㄧㄝˇ']
  };
  uiReadings['難度'] = ['ㄋㄢˊ', 'ㄉㄨˋ'];
  uiReadings['聽聲音，貼上對的字母郵票'] = ['ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ', '', 'ㄊㄧㄝ', 'ㄕㄤˋ', 'ㄉㄨㄟˋ', 'ㄉㄜ˙', 'ㄗˋ', 'ㄇㄨˇ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ'];
  // 玩法框預覽：信封上缺一格，c 郵票飛進去（導演 2026-11-04：開始時要有伊奇說明）
  const PREVIEW = Dino.previews['spell.html'];   // markup 在 shared.js（首頁入口卡共用）
  const setKidText = Dino.kidText(uiReadings);
  // 導演 2026-11-04：聽聲音（A）、聽寫（D）先拿掉，程式保留之後補回（記在 PRODUCT.md Parked Features）
  const MODES = ['auto', 'C', 'B'];
  const AUTO_BY_LEVEL = ['C', 'B', 'B', 'B'];   // 填空（開頭→結尾→母音都過）→ 選字母
  const HINT_MS = 6000;

  // 已有聲音檔的音（assets/audio/phonics/<音>.mp3）；切出來的音沒有檔就不出那個字
  const SOUNDS = new Set([...'abcdefghijklmnopqrstuvwxyz', 'sh', 'ch', 'th', 'ng', 'nk',
    'long_a', 'long_e', 'long_i', 'long_o', 'oo', 'oo_short', 'ow', 'oy', 'ar', 'or', 'er']);
  const { analyze, soundOf, confusables, isVowel } = window.SpellWords;
  const sound = k => `assets/audio/phonics/${k}.mp3`;
  const playSound = k => k ? play(sound(k)) : Promise.resolve();   // 尾巴不發音的 e 不念
  const wordAudio = w => `assets/audio/${w.id}.mp3`;
  const couriers = ['chick_abao', 'feifei', 'iggy', 'xiaokong', 'pairo'];
  const poseSrc = (id, pose) => `assets/cast/${id}__${pose}.webp`;
  const ROUND = 6;

  const masteryKey = 'dinopost-spell-v1', modeKey = 'dinopost-spell-mode', fillKey = 'dinopost-spell-fill-v1', tierKey = 'dinopost-spell-tier';
  const TIERS = ['1', '2', '3', '4', '5'];   // 導演 2026-11-04：預設 3（還沒有母音組合）
  let tier = (() => { try { return TIERS.includes(localStorage.getItem(tierKey)) ? localStorage.getItem(tierKey) : '3'; } catch { return '3'; } })();
  const mastery = (() => { try { return JSON.parse(localStorage.getItem(masteryKey) || '{}'); } catch { return {}; } })();
  const saveMastery = () => { try { localStorage.setItem(masteryKey, JSON.stringify(mastery)); } catch { /* 只影響本頁 */ } };
  // 填空挖哪一格（導演 2026-11-04 要依研究）：音素覺識先會開頭音、再結尾音、中間短母音最難（Yopp 1988、Stahl & Murray 1994；
  // Treiman 兒童拼字母音錯最多）。每個字記自己走到哪一階：開頭 → 結尾 → 中間母音，一次答對才往下一階
  // 4 格以上再多階：子音群裡第二個子音最常被漏掉（frog 拼成 fog、hand 拼成 had；Treiman 1991、1993）；不發音的 e 放最後
  const fillOrder = sp => {
    const keys = [...sp.tiles.keys()].filter(i => i !== sp.silent), last = keys[keys.length - 1];
    return [...new Set([0, last, sp.vowel, ...keys, ...(sp.silent >= 0 ? [sp.silent] : [])])];
  };
  const fillStage = (() => { try { return JSON.parse(localStorage.getItem(fillKey) || '{}'); } catch { return {}; } })();
  const saveFill = () => { try { localStorage.setItem(fillKey, JSON.stringify(fillStage)); } catch { /* 只影響本頁 */ } };
  let mode = (() => { try { return MODES.includes(localStorage.getItem(modeKey)) ? localStorage.getItem(modeKey) : 'auto'; } catch { return 'auto'; } })();

  const state = { words: [], round: [], index: 0, slots: [], target: 0, misses: 0, wordMisses: 0, results: [],
    started: false, busy: false, courier: null, step: '', hintTimer: 0, roundId: 0 };
  const item = () => state.round[state.index];

  function makeArt(word) {
    const art = document.createElement('img'); art.src = word.image; art.alt = '';
    art.classList.add('zb-art'); art.setAttribute('aria-hidden', 'true');
    return art;
  }
  function mystery() {
    const art = document.createElement('span'); art.className = 'zb-art sp-mystery'; art.textContent = '?';
    return art;
  }
  function play(src, volume = 1) { Dino.voice.stop(); return Dino.voice(src, volume); }
  function say(text) {
    const b = $('bubble'); setKidText(b, text);
    b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
  }
  function cheer() {
    const actor = $('actor'); $('actorImg').src = poseSrc(state.courier, 'cheer');
    actor.classList.remove('is-cheer'); void actor.offsetWidth; actor.classList.add('is-cheer');
    setTimeout(() => { $('actorImg').src = poseSrc(state.courier, 'hello'); }, 900);
  }
  function wobble(el) { el.classList.remove('is-wrong'); void el.offsetWidth; el.classList.add('is-wrong'); }
  const currentSlot = () => state.slots[state.target];

  // ---------- 出題 ----------
  function pool() {
    return state.words.filter(w => w.image && w.sp && w.sp.tier <= +tier && w.sp.sounds.every(k => !k || SOUNDS.has(k)));
  }
  const level = w => mastery[w.id] || 0;
  const byLevel = words => Dino.shuffle(words).sort((a, b) => level(a) - level(b) || a.sp.tier - b.sp.tier || a.en.length - b.en.length);   // 同熟練度先出簡單的
  function pickRound() {
    const words = pool();
    return byLevel(words).slice(0, ROUND).map(word => ({ word, mode: mode === 'auto' ? AUTO_BY_LEVEL[level(word)] : mode }));
  }

  // ---------- 出一題 ----------
  const tileClass = (base, letter, i) => `${base}${isVowel(letter, i ?? 1) ? ' is-vowel' : ''}${letter.length > 1 ? ' is-multi' : ''}`;
  function makeBox(letter, i, sp) {
    const box = document.createElement('button'); box.type = 'button';
    box.className = tileClass('sp-box', letter, i) + (i === sp.silent ? ' is-silent' : '');
    const slot = { letter, sound: sp.sounds[i], el: box };
    box.addEventListener('click', () => tapSlot(slot));
    return slot;
  }
  function renderItem() {
    const { word, mode: m } = item();
    clearTimeout(state.hintTimer);
    const pic = $('picture'); pic.replaceChildren(m === 'D' ? mystery() : makeArt(word));
    pic.parentElement.classList.remove('is-new'); void pic.offsetWidth; pic.parentElement.classList.add('is-new');
    $('doneMark').hidden = true;
    state.wordMisses = 0;
    state.slots = word.sp.tiles.map((t, i) => makeBox(t, i, word.sp));
    $('slots').replaceChildren(...state.slots.map(s => s.el));
    $('slots').parentElement.style.setProperty('--n', state.slots.length);
    $('tray').replaceChildren(); $('tray').classList.toggle('is-off', m === 'A');
    $('slots').classList.toggle('is-listen', m === 'A');
    if (m === 'A') {   // 字母一開始就露出來，手指指著下一格（導演 2026-11-04：原本空格子難懂）
      state.step = 'listen'; state.target = 0;
      state.slots.forEach(s => { s.el.textContent = s.letter; s.el.classList.add('is-filled'); });
      say('點手指的字母，聽它的聲音');
    }
    if (m === 'B' || m === 'D') { state.step = 'spell'; state.target = 0; renderTray(word, m === 'D' ? 4 : 2); say(m === 'D' ? '聽一聽，拼出來' : '聽聲音，選字母'); }
    if (m === 'C') {   // 填空：其他字母先放好，只挖一格
      const gap = fillOrder(word.sp)[fillStage[word.id] || 0];
      state.step = 'spell'; state.target = gap;
      state.slots.forEach((s, i) => { if (i !== gap) { s.el.textContent = s.letter; s.el.classList.add('is-filled', 'is-given'); } });
      renderTray(word, 2, [gap]);
      say('缺哪一個字母？');
    }
    markTarget(); renderProgress(); armHint();
  }
  // only：只放這幾格的答案郵票（填空）；干擾郵票挑容易混、但聲音不同的
  function renderTray(word, extras, only) {
    const answers = (only || [...word.sp.tiles.keys()]).map(i => ({ letter: word.sp.tiles[i], sound: word.sp.sounds[i] }));
    const taken = new Set(answers.flatMap(a => [a.letter, a.sound]));
    const ok = g => SOUNDS.has(soundOf(g)) && !taken.has(g) && !taken.has(soundOf(g));
    const near = Dino.shuffle(answers.flatMap(a => confusables(a.letter).filter(ok)));
    if (only?.length === 1 && isVowel(answers[0].letter, 1)) near.push(...Dino.shuffle([...'aeiou'].filter(ok)));   // 填母音：干擾也放母音
    const any = Dino.shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter(ok));
    const extra = [...new Set([...near, ...any])].slice(0, extras).map(g => ({ letter: g, sound: soundOf(g) }));
    $('tray').classList.remove('is-off');
    $('tray').replaceChildren(...Dino.shuffle([...answers, ...extra]).map(({ letter, sound: k }) => {
      const el = document.createElement('button'); el.type = 'button';
      el.className = tileClass('sp-tile', letter); el.dataset.noPress = '';   // 拖曳郵票，自己有按下效果
      el.setAttribute('aria-label', `字母 ${letter}`);
      const stamp = document.createElement('span'); stamp.className = 'zb-stamp'; stamp.textContent = letter;
      el.append(stamp);
      const tile = { el, letter, sound: k, taken: false };
      el.addEventListener('pointerdown', event => { event.preventDefault(); grab(tile); });
      return el;
    }));
  }
  function markTarget() { state.slots.forEach((s, i) => s.el.classList.toggle('is-now', i === state.target)); }
  function renderProgress() {
    $('progress').replaceChildren(...state.round.map((_, i) => {
      const li = document.createElement('li');
      li.className = i < state.index ? `is-done${state.results[i] ? ' is-star' : ''}` : i === state.index ? 'is-now' : '';   // 一次答對蓋郵戳
      return li;
    }));
  }
  // 聽寫：停太久就讓這一格對的郵票發光（用了提示，這題不算一次答對）
  function armHint() {
    clearTimeout(state.hintTimer);
    if (item()?.mode !== 'D' || state.step !== 'spell') return;
    state.hintTimer = setTimeout(() => {
      const tile = [...$('tray').children].find(el => el.textContent === currentSlot()?.letter && !el.classList.contains('is-taken'));
      if (!tile || !state.started) return armHint();
      tile.classList.add('is-hint'); state.wordMisses++;
    }, HINT_MS);
  }

  // ---------- 點格子 ----------
  async function tapSlot(slot) {
    if (!state.started || state.busy) return;
    const { mode: m } = item();
    const i = state.slots.indexOf(slot);
    if (m === 'A') {   // 依序點：每點一格念一個聲音，格子亮起來
      if (i !== state.target) { wobble(currentSlot().el); return; }
      playSound(slot.sound); slot.el.classList.add('is-heard');
      state.target++; markTarget();
      if (state.target >= state.slots.length) { state.busy = true; await wait(700); await wordDone(); }
      return;
    }
    if ((m === 'B' || m === 'C') && slot === currentSlot()) playSound(slot.sound);   // 選字母／填空：卡住時點閃動的格子聽提示（聽寫不給）
  }

  // ---------- 點郵票 ----------
  async function grab(tile) {
    const slot = currentSlot();
    if (!state.started || state.busy || tile.taken || !slot || state.step !== 'spell') return;
    const m = item().mode;
    if (tile.letter !== slot.letter) {
      state.misses++; state.wordMisses++; state.busy = true;
      wobble(tile.el); Dino.sfx('wrong', .25); say('不是這個喔');
      await Promise.race([playSound(tile.sound), wait(1200)]);
      if (m !== 'D') { await wait(250); await Promise.race([playSound(slot.sound), wait(1200)]); }   // 聽寫不再念答案
      state.busy = false; armHint();
      return;
    }
    tile.taken = true; state.busy = true; clearTimeout(state.hintTimer);
    Dino.sfx('pop', .5); playSound(slot.sound);
    const from = tile.el.getBoundingClientRect(), to = slot.el.getBoundingClientRect();
    tile.el.classList.add('is-taken');
    const flyer = document.createElement('span'); flyer.className = 'zb-flyer'; flyer.textContent = tile.letter; if (tile.letter.length > 1) flyer.classList.add('is-multi');
    Object.assign(flyer.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, fontSize: `${from.height * (tile.letter.length > 1 ? .42 : .66)}px` });
    document.body.append(flyer);
    await settle(flyer.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)' },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top - 40}px) scale(${to.width / from.width * 1.1}) rotate(-10deg)`, offset: .7 },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width})` }
    ], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }), 600);
    flyer.remove();
    slot.el.textContent = slot.letter; slot.el.classList.add('is-filled');
    state.target = state.slots.findIndex(s => !s.el.classList.contains('is-filled'));
    if (state.target >= 0) { markTarget(); say('對了！'); state.busy = false; armHint(); return; }
    markTarget();
    await wordDone();
  }

  async function wordDone() {
    const { word, mode: m } = item(), id = state.roundId;
    const stale = () => id !== state.roundId;   // 中途換模式／重開：舊的這一局不要再往下走
    const first = state.wordMisses === 0;
    state.results[state.index] = first;
    if (m === 'C' && first && (fillStage[word.id] || 0) < fillOrder(word.sp).length - 1) {   // 填空還沒挖到母音：只往下一階，熟練度不變
      fillStage[word.id] = (fillStage[word.id] || 0) + 1; saveFill();
    } else mastery[word.id] = m === 'A' ? Math.max(1, level(word)) : Math.max(0, Math.min(3, level(word) + (first ? 1 : -1)));
    saveMastery();
    if (m === 'D') $('picture').replaceChildren(makeArt(word));   // 聽寫拼完才看到圖
    await wait(350);
    for (const s of state.slots) {   // 示範拼讀：一格一格念聲音，再念整個字
        s.el.classList.add('is-say');
      await Promise.race([playSound(s.sound), wait(s.sound ? 1300 : 350)]);
      s.el.classList.remove('is-say');
      await wait(160);
      if (stale()) return;
    }
    $('doneMark').hidden = false; Dino.sfx('stamp', .8); Dino.burst($('picture')); cheer(); say('拼好了！');
    await wait(300);
    await Promise.race([play(wordAudio(word)), wait(2400)]);
    await wait(700);
    if (stale()) return;
    state.index++; state.busy = false;
    if (state.index >= state.round.length) return finish();
    renderItem();
    play(wordAudio(item().word));
  }

  function finish() {
    renderProgress();
    try {
      const results = state.round.map((_, i) => state.results[i] === true);
      Dino.saveHistory?.({ game: 'spell', mode, score: results.filter(Boolean).length, total: state.round.length, ids: state.round.map(it => it.word.id), results });
    } catch { /* 沒有儲存空間也照樣能玩 */ }
    Dino.sfx('finish', .8);
    const stars = state.misses <= 1 ? 3 : state.misses <= 4 ? 2 : 1;
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">${Dino.icon('star')}</span>`).join('');
    $('finishWords').replaceChildren(...state.round.map(it => { const li = document.createElement('li'); li.textContent = it.word.en; return li; }));
    $('finishActor').src = poseSrc(state.courier, 'cheer');
    $('finishOverlay').hidden = false;
  }

  function startRound() {
    $('finishOverlay').hidden = true; state.roundId++; Dino.voice.stop();
    state.round = pickRound(); state.index = 0; state.misses = 0; state.results = []; state.busy = false;
    Dino.preload([...state.round.map(it => wordAudio(it.word)), ...[...new Set(state.round.flatMap(it => it.word.sp.sounds))].filter(Boolean).map(sound)]);
    state.courier = Dino.shuffle(couriers.filter(id => id !== state.courier))[0];
    $('actorImg').src = poseSrc(state.courier, 'hello');
    renderItem();
    window.__spell = state;   // 截圖驗收用
  }

  async function init() {
    setKidText($('title'), '郵票貼字母'); setKidText($('readyTitle'), '點一下，開始拼英文！');
    setKidText($('finishTitle'), '全部拼好了！'); setKidText($('playAgain'), '再玩一次'); setKidText($('finishHome'), '回首頁');
    const picks = [...document.querySelectorAll('[data-mode]')];
    const syncPick = () => picks.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    picks.forEach(b => {
      setKidText(b, b.textContent);
      b.addEventListener('click', () => {
        mode = b.dataset.mode; try { localStorage.setItem(modeKey, mode); } catch { /* 只影響本頁 */ }
        syncPick(); if (state.words.length) startRound();
      });
    });
    syncPick();
    const tierPicks = [...document.querySelectorAll('[data-tier]')];
    const syncTier = () => tierPicks.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tier === tier)));
    tierPicks.forEach(b => b.addEventListener('click', () => {
      tier = b.dataset.tier; try { localStorage.setItem(tierKey, tier); } catch { /* 只影響本頁 */ }
      syncTier(); if (state.words.length) startRound();
    }));
    syncTier(); setKidText($('tierLabel'), '難度');
    Dino.menuTaps($('readyOverlay')); Dino.menuTaps($('finishOverlay'));
    $('replay').addEventListener('click', () => play(wordAudio(item().word)));
    $('playAgain').addEventListener('click', () => { Dino.sfx('tap', .5); $('finishOverlay').hidden = true; state.started = false; $('readyOverlay').hidden = false; startRound(); });
    document.querySelector('.gh .dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
    $('menuBtn').addEventListener('click', () => { if (!$('readyOverlay').hidden) return; Dino.sfx('tap', .5); state.started = false; clearTimeout(state.hintTimer); $('readyOverlay').hidden = false; });
    state.words = (await fetch('data.json').then(r => r.json())).map(w => ({ ...w, sp: analyze(w.en) }));
    startRound();
    const howto = Dino.howto({ preview: PREVIEW, text: '聽聲音，貼上對的字母郵票', kid: setKidText, voice: 'spell' });
    $('helpButton').addEventListener('click', () => { Dino.sfx('tap', .5); howto.show(); });
    $('readyStart').addEventListener('click', () => {
      $('readyOverlay').hidden = true;
      howto.first().then(() => { state.started = true; armHint(); play(wordAudio(item().word)); });   // 第一次玩先看玩法＋伊奇念
    });
  }
  init();
})();
