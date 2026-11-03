// 字母送信（sample，導演 2026-11-03 選模式 B「字母送信」）：看圖聽英文，依序點字母郵票拼出 3 個字母的短字（cat、pig、sun…）。
// 依教學原則：每放一個字母念它的「聲音」（不是名稱，assets/audio/phonics/）；點錯念出那張的聲音，再念這一格要的聲音；
// 拼好後慢慢把三個聲音連起來念，再念整個字（示範拼讀）。不限時、沒有輸送帶。
// 熟練度 0–3 存在本機：一次拼對升一級、拼錯降一級；出題先挑熟練度低的字。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduced ? 0 : ms));
  const settle = (anim, ms) => Promise.race([anim.finished, wait(ms)]);

  const uiReadings = {
    '字母送信': ['ㄗˋ', 'ㄇㄨˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ'],
    '點一下，開始拼英文！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄆㄧㄣ', 'ㄧㄥ', 'ㄨㄣˊ', ''],
    '聽聲音，選字母': ['ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ', '', 'ㄒㄩㄢˇ', 'ㄗˋ', 'ㄇㄨˇ'],
    '不是這個喔': ['ㄅㄨˊ', 'ㄕˋ', 'ㄓㄜˋ', 'ㄍㄜ˙', 'ㄛ'],
    '對了！': ['ㄉㄨㄟˋ', 'ㄌㄜ˙', ''],
    '拼好了！': ['ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '全部拼好了！': ['ㄑㄩㄢˊ', 'ㄅㄨˋ', 'ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ']
  };
  const setKidText = Dino.kidText(uiReadings);

  // 已有聲音檔的字母（x、y、z 尚未生成，含它們的字先不出）
  const HAVE = new Set('abcdefghijklmnopqrstuvw');
  const VOWELS = new Set('aeiou');
  const NOT_SHORT = new Set('rwy');   // 結尾 r／w／y 會改變母音（car、cow），不是短母音
  // 干擾郵票：母音挑最容易聽混的；子音挑長得像或聽起來像的（不放同音字母，如 c／k）
  const confusables = { a: 'e', e: 'ia', i: 'e', o: 'u', u: 'oa',
    b: 'dp', d: 'bt', p: 'bq', g: 'jq', h: 'n', j: 'g', m: 'n', n: 'mh', t: 'df', c: 'g', s: 'f', r: 'l', l: 'r', f: 'v', w: 'v', v: 'f' };
  const sound = l => `assets/audio/phonics/${l}.mp3`;
  const wordAudio = w => `assets/audio/${w.id}.mp3`;
  const couriers = ['chick_abao', 'feifei', 'iggy', 'xiaokong', 'pairo'];
  const poseSrc = (id, pose) => `assets/cast/${id}__${pose}.webp`;
  const ROUND = 6;

  const masteryKey = 'dinopost-spell-v1';
  const mastery = (() => { try { return JSON.parse(localStorage.getItem(masteryKey) || '{}'); } catch { return {}; } })();
  const saveMastery = () => { try { localStorage.setItem(masteryKey, JSON.stringify(mastery)); } catch { /* 只影響本頁 */ } };

  const state = { words: [], round: [], index: 0, slots: [], target: 0, misses: 0, wordMisses: 0, results: [],
    started: false, busy: false, courier: null };

  function makeArt(word) {
    const art = document.createElement('img'); art.src = word.image; art.alt = '';
    art.classList.add('zb-art'); art.setAttribute('aria-hidden', 'true');
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
  const currentSlot = () => state.slots[state.target];

  // ---------- 出題：熟練度低的先出，同熟練度隨機 ----------
  function pool() {
    return state.words.filter(w => /^[a-z]{3}$/.test(w.en) && w.image
      && [...w.en].every(l => HAVE.has(l)) && !VOWELS.has(w.en[0]) && VOWELS.has(w.en[1]) && !VOWELS.has(w.en[2]) && !NOT_SHORT.has(w.en[2]));
  }
  function pickRound() {
    return Dino.shuffle(pool()).sort((a, b) => (mastery[a.id] || 0) - (mastery[b.id] || 0)).slice(0, ROUND);
  }

  function renderWord() {
    const word = state.round[state.index];
    const pic = $('picture'); pic.replaceChildren(makeArt(word));
    pic.parentElement.classList.remove('is-new'); void pic.offsetWidth; pic.parentElement.classList.add('is-new');
    $('doneMark').hidden = true;
    state.target = 0; state.wordMisses = 0;
    state.slots = [...word.en].map(letter => {
      const box = document.createElement('button'); box.type = 'button';
      box.className = `sp-box${VOWELS.has(letter) ? ' is-vowel' : ''}`;
      box.setAttribute('aria-label', '聽這一格的聲音');
      box.addEventListener('click', () => { if (currentSlot()?.el === box) play(sound(letter)); });   // 卡住時點閃動的格子聽提示
      return { letter, el: box };
    });
    $('slots').replaceChildren(...state.slots.map(s => s.el));
    renderTray(word);
    markTarget(); renderProgress();
    say('聽聲音，選字母');
  }
  function renderTray(word) {
    const letters = [...word.en];
    const vowel = letters[1], cons = Dino.shuffle([letters[0], letters[2]])[0];
    const pickFrom = s => [...s].filter(l => HAVE.has(l) && !letters.includes(l));
    const extra = [pickFrom(confusables[vowel] || '')[0], Dino.shuffle(pickFrom(confusables[cons] || ''))[0]].filter(Boolean);
    $('tray').replaceChildren(...Dino.shuffle([...letters, ...extra]).map(letter => {
      const el = document.createElement('button'); el.type = 'button';
      el.className = `sp-tile${VOWELS.has(letter) ? ' is-vowel' : ''}`;
      el.setAttribute('aria-label', `字母 ${letter}`);
      const stamp = document.createElement('span'); stamp.className = 'zb-stamp'; stamp.textContent = letter;
      el.append(stamp);
      const tile = { el, letter, taken: false };
      el.addEventListener('pointerdown', event => { event.preventDefault(); grab(tile); });
      return el;
    }));
  }
  function markTarget() { state.slots.forEach((s, i) => s.el.classList.toggle('is-now', i === state.target)); }
  function renderProgress() {
    $('progress').replaceChildren(...state.round.map((_, i) => {
      const li = document.createElement('li');
      li.className = i < state.index ? 'is-done' : i === state.index ? 'is-now' : '';
      return li;
    }));
  }

  async function grab(tile) {
    const slot = currentSlot();
    if (!state.started || state.busy || tile.taken || !slot) return;
    if (tile.letter !== slot.letter) {   // 錯：念出這張的聲音，再念這一格要的聲音（讓孩子聽出差別）
      state.misses++; state.wordMisses++; state.busy = true;
      tile.el.classList.remove('is-wrong'); void tile.el.offsetWidth; tile.el.classList.add('is-wrong');
      Dino.sfx('wrong', .25); say('不是這個喔');
      await Promise.race([play(sound(tile.letter)), wait(1200)]);
      await wait(250);
      await Promise.race([play(sound(slot.letter)), wait(1200)]);
      state.busy = false;
      return;
    }
    tile.taken = true; state.busy = true;
    Dino.sfx('pop', .5); play(sound(tile.letter));
    const from = tile.el.getBoundingClientRect(), to = slot.el.getBoundingClientRect();
    tile.el.classList.add('is-taken');
    const flyer = document.createElement('span'); flyer.className = 'zb-flyer'; flyer.textContent = tile.letter;
    Object.assign(flyer.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, fontSize: `${from.height * .66}px` });
    document.body.append(flyer);
    await settle(flyer.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)' },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top - 40}px) scale(${to.width / from.width * 1.1}) rotate(-10deg)`, offset: .7 },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width})` }
    ], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }), 600);
    flyer.remove();
    slot.el.textContent = slot.letter; slot.el.classList.add('is-filled');
    state.target++;
    if (state.target < state.slots.length) { markTarget(); say('對了！'); state.busy = false; return; }
    state.slots.forEach(s => s.el.classList.remove('is-now'));
    await wordDone();
  }

  async function wordDone() {
    const word = state.round[state.index];
    const first = state.wordMisses === 0;
    state.results[state.index] = first;
    mastery[word.id] = Math.max(0, Math.min(3, (mastery[word.id] || 0) + (first ? 1 : -1))); saveMastery();
    await wait(350);
    for (const s of state.slots) {   // 示範拼讀：一格一格念聲音，再念整個字
      s.el.classList.add('is-say');
      await Promise.race([play(sound(s.letter)), wait(1300)]);
      s.el.classList.remove('is-say');
      await wait(160);
    }
    $('doneMark').hidden = false; Dino.sfx('stamp', .8); Dino.burst($('picture')); cheer(); say('拼好了！');
    await wait(300);
    await Promise.race([play(wordAudio(word)), wait(2400)]);
    await wait(700);
    state.index++; state.busy = false;
    if (state.index >= state.round.length) return finish();
    renderWord();
    play(wordAudio(state.round[state.index]));
  }

  function finish() {
    renderProgress();
    try {
      const results = state.round.map((_, i) => state.results[i] === true);
      Dino.saveHistory?.({ game: 'spell', mode: 'cvc', score: results.filter(Boolean).length, total: state.round.length, ids: state.round.map(w => w.id), results });
    } catch { /* 沒有儲存空間也照樣能玩 */ }
    Dino.sfx('finish', .8);
    const stars = state.misses <= 1 ? 3 : state.misses <= 4 ? 2 : 1;
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishWords').replaceChildren(...state.round.map(w => { const li = document.createElement('li'); li.textContent = w.en; return li; }));
    $('finishActor').src = poseSrc(state.courier, 'cheer');
    $('finishOverlay').hidden = false;
  }

  function startRound() {
    $('finishOverlay').hidden = true;
    state.round = pickRound(); state.index = 0; state.misses = 0; state.results = []; state.busy = false;
    Dino.preload([...state.round.map(wordAudio), ...[...HAVE].map(sound)]);
    state.courier = Dino.shuffle(couriers.filter(id => id !== state.courier))[0];
    $('actorImg').src = poseSrc(state.courier, 'hello');
    renderWord();
    window.__spell = state;   // 截圖驗收用
  }

  async function init() {
    setKidText($('title'), '字母送信'); setKidText($('readyTitle'), '點一下，開始拼英文！');
    setKidText($('finishTitle'), '全部拼好了！'); setKidText($('playAgain'), '再玩一次'); setKidText($('finishHome'), '回首頁');
    Dino.menuTaps($('readyOverlay')); Dino.menuTaps($('finishOverlay'));
    $('replay').addEventListener('click', () => play(wordAudio(state.round[state.index])));
    $('playAgain').addEventListener('click', () => { startRound(); play(wordAudio(state.round[0])); });
    document.querySelector('.gh .dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
    state.words = await fetch('data.json').then(r => r.json());
    startRound();
    $('readyStart').addEventListener('click', () => {
      $('readyOverlay').hidden = true; state.started = true;
      play(wordAudio(state.round[state.index]));
    });
  }
  init();
})();
