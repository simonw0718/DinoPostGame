// 注音送信（導演 2026-10-21 核准 mail-sample v10 套用）：紅郵筒之字排＋磁吸拖信＋送信角色輪替；寬螢幕自動切一排版。
// 出題、難度、題庫開關、作答紀錄與郵票都沿用 shared.js／progress.js／stamps-ui.js。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const animate = Motion.animate;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = s => reduced ? .01 : s;
  const wait = ms => new Promise(res => setTimeout(res, reduced ? 0 : ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 背景（media_catalog master:location-*）：每回合換下一張，一般 4 張、DINO MODE 3 張
  const backgrounds = {
    normal: [
      { key: 'village-outside-road', src: 'assets/mail-bg/village-outside-road.jpg', x: '38%' },
      { key: 'grass-slope-wide-village-view', src: 'assets/mail-bg/grass-slope-wide-village-view.jpg', x: '62%' },
      { key: 'near-village', src: 'assets/mail-bg/near-village.jpg', x: '50%' },
      { key: 'forest-delivery-path-ferns', src: 'assets/mail-bg/forest-delivery-path-ferns.jpg', x: '62%' }
    ],
    dino: [
      { key: 'prehistoric-valley-intro', src: 'assets/dino-valley.jpg', x: '30%' },
      { key: 'damp-fern-valley-forest', src: 'assets/mail-bg/damp-fern-valley-forest.jpg', x: '50%' },
      { key: 'hilltop-flat-to-shallow-river-slope', src: 'assets/mail-bg/hilltop-flat-to-shallow-river-slope.jpg', x: '50%' }
    ]
  };
  // 送信角色：只用現有方向（walk 都朝右；起點在最左，所以不需要往左走的卡）
  const couriers = [
    { id: 'feifei', idle: 'hello', walk: 'walk_parcel_r', cheer: 'cheer' },
    { id: 'iggy', idle: 'hello', walk: 'walk_r', cheer: 'cheer' },
    { id: 'chick_abao', idle: 'busy_letter', walk: 'walk_r', cheer: 'cheer' },
    { id: 'xiaokong', idle: 'hello', walk: 'run_r', cheer: 'cheer' },
    { id: 'pairo', idle: 'hello', walk: 'walk_r', cheer: 'cheer' }
  ];
  const disabledStorageKey = Dino.storageKeys.disabled;
  const selectionStorageKey = 'dinopost-mail-selection-v1';
  const rotationStorageKey = 'dinopost-mail-rotation-v2';   // 下一回合的背景與第一位送信角色

  const uiReadings = {
    '點一下，開始送信！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ', ''],
    '開始送信': ['ㄎㄞ', 'ㄕˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ'],
    '讀注音，送到郵箱': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ', '', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '看圖片，送到郵箱': ['ㄎㄢˋ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', '', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '選一個郵箱': ['ㄒㄩㄢˇ', 'ㄧ', 'ㄍㄜ˙', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '先點信，再選郵箱': ['ㄒㄧㄢ', 'ㄉㄧㄢˇ', 'ㄒㄧㄣˋ', '', 'ㄗㄞˋ', 'ㄒㄩㄢˇ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '再試一次': ['ㄗㄞˋ', 'ㄕˋ', 'ㄧ', 'ㄘˋ'],
    '送達啦！': ['ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
    '連續送對！': ['ㄌㄧㄢˊ', 'ㄒㄩˋ', 'ㄙㄨㄥˋ', 'ㄉㄨㄟˋ', ''],
    '拿到郵票了！': ['ㄋㄚˊ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', 'ㄌㄜ˙', ''],
    '下一封': ['ㄒㄧㄚˋ', 'ㄧ', 'ㄈㄥ'],
    '看成果': ['ㄎㄢˋ', 'ㄔㄥˊ', 'ㄍㄨㄛˇ'],
    '恐龍郵局': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄧㄡˊ', 'ㄐㄩˊ'],
    '收件確認': ['ㄕㄡ', 'ㄐㄧㄢˋ', 'ㄑㄩㄝˋ', 'ㄖㄣˋ'],
    '信件準備中': ['ㄒㄧㄣˋ', 'ㄐㄧㄢˋ', 'ㄓㄨㄣˇ', 'ㄅㄟˋ', 'ㄓㄨㄥ'],
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '送信任務完成': ['ㄙㄨㄥˋ', 'ㄒㄧㄣˋ', 'ㄖㄣˋ', 'ㄨˋ', 'ㄨㄢˊ', 'ㄔㄥˊ'],
    '第一次就送對': ['ㄉㄧˋ', 'ㄧ', 'ㄘˋ', 'ㄐㄧㄡˋ', 'ㄙㄨㄥˋ', 'ㄉㄨㄟˋ'],
    '封': ['ㄈㄥ'],
    '再送一次': ['ㄗㄞˋ', 'ㄙㄨㄥˋ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '題庫載入失敗': ['ㄊㄧˊ', 'ㄎㄨˋ', 'ㄗㄞˋ', 'ㄖㄨˋ', 'ㄕ', 'ㄅㄞˋ'],
    '可用單字不足': ['ㄎㄜˇ', 'ㄩㄥˋ', 'ㄉㄢ', 'ㄗˋ', 'ㄅㄨˋ', 'ㄗㄨˊ']
  };
  const setKidText = Dino.kidText(uiReadings);
  const makeKidSpan = value => { const span = document.createElement('span'); setKidText(span, value); return span; };

  const sounds = Object.fromEntries(['correct', 'stamp', 'wrong', 'finish'].map(k => {
    const a = new Audio(`assets/audio/effects/${k}.mp3`); a.preload = 'auto'; a.volume = .9; return [k, a];
  }));
  const playSound = kind => { const s = sounds[kind]; s.pause(); try { s.currentTime = 0; } catch { /* ok */ } s.play().catch(() => {}); };

  const state = { words: [], activePool: [], round: [], choices: [], index: 0, attempts: 0, streak: 0, firstTry: 0, phase: 'loading',
    armed: false, dragging: false, audio: null, cast: null, dino: Dino.dinoMode(), bg: 0, courier: 0,
    disabledIds: new Set(), answerResults: [], progressResults: [],
    mode: 'all', level: 1, count: 5, autoAudio: true, format: 'zhuyin',
    nextMode: 'all', nextLevel: 1, nextCount: 5, nextAutoAudio: true, nextFormat: 'zhuyin' };   // format：zhuyin＝看注音找圖片；picture＝看圖片找注音

  // ---------- 彈簧物理（每個值：位置、速度、目標；k 硬度、c 阻尼） ----------
  const spring = (value, k = 170, c = 14) => ({ v: value, vel: 0, to: value, k, c });
  function stepSpring(s, dt) {
    const a = -s.k * (s.v - s.to) - s.c * s.vel;
    s.vel += a * dt; s.v += s.vel * dt;
  }
  const letterPhys = { x: spring(0, 150, 13), y: spring(0, 150, 13), s: spring(1, 220, 18), tilt: spring(0, 160, 9) };
  // ---------- 舞台：設計座標，整體等比例縮放；所有座標都用設計座標 ----------
  const LW = 300, LH = 176, MAGNET = 100;
  // 版面：手機＝375×812 之字排；iPad 直式＝560×812 倒三角；寬螢幕（寬高比>1.15）改用 900×562 一排版（導演 2026-10-21 選定）。
  // 座標都是設計 px：boxes 郵筒左上、letter 信左上、home 角色腳底、replay ♫、next 下一封、bubbleY 題目泡泡底、lift 往上拖多遠縮到最小
  const LAYOUTS = {
    phone: { DW: 375, DH: 812, boxes: [[8, 62], [195, 196], [8, 330]], letter: [63, 624], home: [300, 612], replay: [12, 636], next: [63, 552], bubbleY: 606, lift: 260 },
    // iPad 直式（寬高比 0.6–1.15，導演 2026-10-21）：舞台加寬到 560，三郵筒排成倒三角，物件跟著畫面放大不留白
    tablet: { DW: 560, DH: 812, boxes: [[30, 62], [358, 62], [194, 318]], letter: [150, 624], home: [387, 612], replay: [99, 636], next: [150, 552], bubbleY: 606, lift: 260 },
    row: { DW: 900, DH: 562, boxes: [[114, 62], [364, 62], [614, 62]], letter: [300, 366], home: [700, 548], replay: [232, 378], next: [110, 470], bubbleY: 356, lift: 200 },
  };
  let L = LAYOUTS.phone, DW = L.DW, DH = L.DH, BOXES = L.boxes;
  let K = 1;
  const stageEl = $('stage');
  const toWorld = (cx, cy) => { const r = stageEl.getBoundingClientRect(); return { x: (cx - r.left) / K, y: (cy - r.top) / K }; };
  const centerOf = el => { const r = el.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
  let letterO = { x: LW / 2, y: LH / 2 };   // 信的 transform-origin（設計 px）
  let boxPhys = [];   // 每個郵筒：傾斜角、縮放
  let drag = { vx: 0, lastT: 0 };
  let lastFrame = performance.now();
  const vibrate = p => { try { navigator.vibrate?.(p); } catch { /* ok */ } };
  function setOrigin(ox, oy) {   // 換支點時補償位移，視覺位置不變
    const s = letterPhys.s.v;
    letterPhys.x.v += (letterO.x - ox) * (1 - s); letterPhys.y.v += (letterO.y - oy) * (1 - s);
    letterO = { x: ox, y: oy };
    $('letter').style.transformOrigin = `${ox}px ${oy}px`;
    $('letterFace').style.setProperty('--grab-x', `${ox}px`); $('letterFace').style.setProperty('--grab-y', `${oy}px`);
  }
  function frame(now) {
    const dt = Math.min(.034, (now - lastFrame) / 1000); lastFrame = now;
    const letter = $('letter');
    // 信：拖曳中跟著手指，速度讓它像掛在指尖一樣擺盪；放開後彈簧拉回原位
    letterPhys.tilt.to = state.dragging ? clamp(drag.vx * .028, -22, 22) : 0;
    drag.vx *= .86;
    stepSpring(letterPhys.tilt, dt);
    if (!state.dragging) ['x', 'y', 's'].forEach(k => stepSpring(letterPhys[k], dt));
    // 磁吸：信中心離某郵筒 100px 內 → 該郵筒張嘴，其他變暗
    let near = -1, lc = null;
    if (state.dragging && state.phase === 'question') {
      lc = centerOf(letter);
      let best = MAGNET;
      BOXES.forEach(([x, y], i) => {
        const dx = Math.max(x + 6 - lc.x, 0, lc.x - (x + 166)), dy = Math.max(y - lc.y, 0, lc.y - (y + 224));
        const d = Math.hypot(dx, dy);
        if (d < best) { best = d; near = i; }
      });
    }
    state.magnet = near;
    if (state.phase === 'question') {
      letter.style.transform = `translate3d(${letterPhys.x.v}px, ${letterPhys.y.v}px, 0) scale(${letterPhys.s.v})`;
      $('letterFace').style.rotate = `${letterPhys.tilt.v}deg`;
    }
    // 郵筒：被磁吸的那支朝信傾斜、微微放大
    [...document.querySelectorAll('.mailbox')].forEach((box, i) => {
      const p = boxPhys[i]; if (!p) return;
      const mouth = near === i;
      box.classList.toggle('mouth', mouth);
      box.classList.toggle('dim', near >= 0 && !mouth);
      if (mouth) { p.lean.to = (lc.x < BOXES[i][0] + 86 ? -1 : 1) * 6; p.size.to = 1.04; } else { p.lean.to = 0; p.size.to = 1; }
      stepSpring(p.lean, dt); stepSpring(p.size, dt);
      box.style.transform = `rotate(${p.lean.v}deg) scale(${p.size.v})`;
    });
    requestAnimationFrame(frame);
  }

  // ---------- 背景與輪替（DINO MODE 由 shared.js 依首頁開關加 html.dino-mode） ----------
  function loadRotation() {
    try { const r = JSON.parse(localStorage.getItem(rotationStorageKey) || 'null'); if (r) return r; } catch { /* first visit */ }
    return { bg: Math.floor(Math.random() * 12), courier: Math.floor(Math.random() * couriers.length) };
  }
  function applyBackground() {
    const list = backgrounds[state.dino ? 'dino' : 'normal'], bg = list[state.bg % list.length];
    const shell = document.querySelector('.ms-shell');
    shell.style.setProperty('--bg', `url('${bg.src}')`); shell.style.setProperty('--bg-x', bg.x);
  }

  // ---------- 版面：整個設計舞台等比例縮放置中 ----------
  const actor = $('actor'), actorImg = $('actorImg'), bob = actor.querySelector('.ms-actor-bob');
  const u = 150, home = { x: 300, y: 612 };   // 手機：角色站右側，腳底 y=612（寬版由 LAYOUTS 改寫）
  actor.style.setProperty('--u', `${u}px`);
  const px = (el, [x, y]) => { el.style.left = `${x}px`; el.style.top = `${y}px`; };
  function applyLayout(next) {   // 只在版面種類改變時搬家；彈簧位移是相對位置，不必重算
    if (L === next) return;
    L = next; DW = L.DW; DH = L.DH; BOXES = L.boxes; home.x = L.home[0]; home.y = L.home[1];
    stageEl.style.width = `${DW}px`; stageEl.style.height = `${DH}px`; document.querySelector('.ms-top').style.width = `${DW}px`;
    document.documentElement.classList.toggle('wide', L !== LAYOUTS.phone);
    [$('letter'), $('receipt')].forEach(el => px(el, L.letter));
    px($('replayButton'), L.replay); px($('nextButton'), L.next);
    $('ghost').style.transform = `translate(${L.letter[0] - 63}px, ${L.letter[1] - 624}px)`;
    document.querySelectorAll('.mailbox').forEach((b, i) => px(b, BOXES[i]));
  }
  function layout() {
    const shell = document.querySelector('.ms-shell');
    document.documentElement.classList.add('wide');   // 先放開外框寬度再量（窄螢幕會在 applyLayout 收回）
    const W = shell.clientWidth, H = shell.clientHeight;
    document.documentElement.classList.toggle('wide', L !== LAYOUTS.phone);
    applyLayout(W / H > 1.15 ? LAYOUTS.row : W / H > .6 ? LAYOUTS.tablet : LAYOUTS.phone);
    K = Math.min(shell.clientWidth / DW, shell.clientHeight / DH);
    stageEl.style.transform = `translate(${(shell.clientWidth - DW * K) / 2}px, ${(shell.clientHeight - DH * K) / 2}px) scale(${K})`;
    if (state.phase === 'question' || state.phase === 'loading') placeActor(home.x, home.y, 1);
  }
  function placeActor(x, y, s) {
    actor.style.transform = `translate(${x}px, ${y}px)`; actor.dataset.x = x; actor.dataset.y = y;
    bob.style.scale = String(s); actor.dataset.s = s;
  }
  const courier = () => couriers[(state.courier + state.index) % couriers.length];   // 每封信換一位送信角色
  function pose(name) {
    const c = courier(), info = state.cast[c.id], p = info.poses[name];
    actorImg.src = p.src;
    actorImg.style.setProperty('--h', info.height * p.pose_factor);   // 身高＝u × character_scale × pose_factor
  }
  function resetCourier() { pose(courier().idle); placeActor(home.x, home.y, 1); }

  // ---------- 對話泡泡：題目提示在角色腳邊左側；其他短句在角色頭旁，不蓋信與郵筒 ----------
  let bubbleTimer = 0;
  let bubbleHigh = false;
  function placeBubble() {
    const b = $('status'), x = +actor.dataset.x;
    const room = x - 24 - b.offsetWidth >= 8;   // 角色左邊放不下就改放右邊
    const left = clamp(room ? x - 24 - b.offsetWidth : x + 24, 8, DW - b.offsetWidth - 8);
    let bottom = L.bubbleY;
    if (bubbleHigh) { const r = actorImg.getBoundingClientRect(); bottom = toWorld(0, r.top).y + 52; }
    b.style.left = `${left}px`; b.style.top = `${bottom - b.offsetHeight}px`;
    b.style.setProperty('--tail', `${clamp(x - 24 - left - 30, 14, b.offsetWidth - 28)}px`);
  }
  function say(text, ms = 2600, high = true) {
    const b = $('status'); bubbleHigh = high;
    setKidText(b, text); placeBubble();
    clearTimeout(bubbleTimer);
    animate(b, { opacity: [0, 1], scale: [.6, 1] }, { type: 'spring', stiffness: 380, damping: 18, duration: dur(.4) });
    if (ms) bubbleTimer = setTimeout(() => animate(b, { opacity: 0, scale: .9 }, { duration: dur(.3) }), ms);
  }

  // ---------- 設定（下一回合生效） ----------
  const modeLabel = (mode = state.nextMode, level = state.nextLevel) => mode === 'dinosaur' ? '恐龍挑戰' : mode === 'level' ? ['第一級', '第二級', '第三級'][level - 1] : '全部';
  function saveSelection() {
    try { localStorage.setItem(selectionStorageKey, JSON.stringify({ mode: state.nextMode, level: state.nextLevel, count: state.nextCount, format: state.nextFormat, autoAudio: state.nextAutoAudio })); } catch { /* Selection still works for this visit. */ }
  }
  function renderSelectionControls() {
    document.querySelectorAll('.mail-mode-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mailMode === state.nextMode)));
    $('mailLevelControl').hidden = state.nextMode !== 'level';
    $('mailLevelSlider').value = String(state.nextLevel);
    $('mailLevelText').textContent = ['第一級', '第二級', '第三級'][state.nextLevel - 1];
    document.querySelectorAll('.mail-format-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mailFormat === state.nextFormat)));
    $('mailAutoAudio').checked = state.nextAutoAudio; $('mailCount').value = String(state.nextCount); $('mailCountValue').value = String(state.nextCount);
    $('mailSelectionSummary').textContent = `下一回合：${modeLabel()} · ${state.nextFormat === 'picture' ? '看圖片' : '看注音'} · ${state.nextCount} 封`;
  }
  function setSelection(change) { Object.assign(state, change); saveSelection(); renderSelectionControls(); }

  // ---------- 題目 ----------
  function renderProgress(done = state.index) {
    $('progress').replaceChildren(...state.round.map((_, i) => {
      const li = document.createElement('li');
      li.className = i < done ? 'done' : i === done ? 'now' : '';
      return li;
    }));
    $('progress').classList.toggle('many', state.round.length > 6);
    $('progress').setAttribute('aria-label', `第 ${state.index + 1}／${state.count} 封`);
  }
  function renderReading(word, container) {   // 注音直排、聲調在右（信面或看圖片模式的郵筒窗）
    container.replaceChildren();
    container.classList.toggle('is-long', word.zhuyin.length > 3);
    for (const raw of word.zhuyin) {
      const chars = [...raw];
      const neutral = chars[0] === '˙' || chars.at(-1) === '˙';
      const tone = chars[0] === '˙' ? chars.shift() : /[ˊˇˋ˙]$/.test(raw) ? chars.pop() : '';
      const syllable = document.createElement('span'); syllable.className = 'zy-syllable';
      const main = document.createElement('span'); main.className = 'zy-main'; main.setAttribute('lang', 'zh-Bopo');
      chars.forEach(char => { const s = document.createElement('span'); s.className = 'zy-symbol'; s.textContent = char; main.append(s); });
      syllable.append(main);
      if (tone) { const m = document.createElement('span'); m.className = 'zy-tone' + (neutral ? ' neutral' : ''); m.textContent = tone; syllable.append(m); }
      container.append(syllable);
    }
    return container;
  }
  function makeArt(word) {
    let art;
    if (!Dino.isNumber(word) && word.image) {
      art = document.createElement('img'); art.src = word.image; art.alt = '';
      art.addEventListener('error', () => { const fallback = document.createElement('span'); fallback.className = 'mailbox-art'; fallback.textContent = word.emoji; art.replaceWith(fallback); }, { once: true });
    } else {
      art = document.createElement('span');
      if (word.sheet && Number.isInteger(word.cell)) {
        art.className = `mailbox-art sheet ${word.sheet}`;
        art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.jpg')`;
        art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
      } else art.textContent = word.emoji;
    }
    art.classList.add('mailbox-art'); art.setAttribute('aria-hidden', 'true');
    return art;
  }
  // 干擾選項：先從本回合題庫，再從其他等級的同圖風格單字。
  function distractorPools(word, pool) {
    const wider = state.words.filter(item => !state.disabledIds.has(item.id) && Dino.isDino(item) === Dino.isDino(word));
    return [pool, wider].map(list => list.filter(item => item.id !== word.id && Dino.visualGroup(item) === Dino.visualGroup(word) && item.zh !== word.zh));
  }
  function choicesFor(word, pool) {   // 同主題優先、再同主題群、最後其他同風格
    const group = Dino.topicGroup(word);
    const candidates = distractorPools(word, pool).flatMap(same => Dino.shuffle(same.filter(i => i.topic === word.topic))
      .concat(Dino.shuffle(same.filter(i => i.topic !== word.topic && Dino.topicGroup(i) === group)))
      .concat(Dino.shuffle(same.filter(i => Dino.topicGroup(i) !== group))));
    const sound = item => item.zhuyin.join(' ');   // 看圖片模式郵筒寫注音，所以注音也不能重複
    const seen = new Set([word.zh, sound(word)]), other = [];
    for (const item of candidates) { if (seen.has(item.zh) || seen.has(sound(item))) continue; seen.add(item.zh); seen.add(sound(item)); other.push(item); if (other.length === 2) break; }
    if (other.length !== 2) throw Error(`這個單字找不到三個同風格郵箱：${word.id}`);
    return Dino.shuffle([word, ...other]);
  }
  const body = box => box.querySelector('.pb-body');
  const squash = box => animate(body(box), { scaleX: [1, 1.14, .93, 1.03, 1], scaleY: [1, .84, 1.08, .98, 1] }, { duration: dur(.55), ease: 'easeOut' });
  function renderMailboxes(options) {
    $('mailboxes').replaceChildren(...options.map((word, i) => {
      const b = document.createElement('button');
      b.className = 'mailbox pb'; b.type = 'button'; b.dataset.wordId = word.id;
      b.style.left = `${BOXES[i][0]}px`; b.style.top = `${BOXES[i][1]}px`;
      b.setAttribute('aria-label', `郵筒 ${i + 1}：${word.zh}`);
      b.innerHTML = '<span class="pb-shadow"></span><span class="pb-legs"><i></i><i></i></span><span class="pb-body"><span class="pb-medal">P</span><span class="pb-slot"></span><span class="pb-cap"></span><span class="pb-win"></span></span><span class="pb-flag" aria-hidden="true"></span>';
      b.querySelector('.pb-win').append(state.format === 'picture' ? renderReading(word, Object.assign(document.createElement('span'), { className: 'box-reading' })) : makeArt(word));
      b.addEventListener('click', () => {
        if (state.phase !== 'question' || state.dragging) return;
        if (!state.armed) {   // 還沒拿信：郵筒被按得扁扁再彈回來，信也跳一下提醒
          squash(b);
          say('先點信，再選郵箱');
          letterPhys.y.vel -= 420; letterPhys.tilt.vel += 160;
          return;
        }
        answer(word, b);
      });
      return b;
    }));
    boxPhys = options.map(() => ({ lean: spring(0, 200, 13), size: spring(1, 260, 16) }));
  }
  function playPrompt() {
    const word = state.round[state.index];
    if (!word?.zhAudio) return;
    if (state.audio) state.audio.pause();
    state.audio = new Audio(word.zhAudio);
    // 手機剛進頁還沒點過畫面時會被擋：蓋上「點一下開始」，點了再補播
    state.audio.play().catch(error => { if (error.name === 'NotAllowedError') showTapToStart(); });
  }
  function showTapToStart() {
    const tap = $('readyOverlay');
    if (!tap.hidden) return;
    tap.hidden = false; tap.focus();
  }
  function renderQuestion() {
    const word = state.round[state.index];
    window.__answerId = word.id;   // 截圖驗收腳本用
    state.phase = 'question'; state.attempts = 0; state.armed = false; state.dragging = false; state.magnet = -1;
    renderProgress();
    const picture = state.format === 'picture';
    $('reading').hidden = picture; $('letterArt').hidden = !picture;
    if (picture) $('letterArt').replaceChildren(makeArt(word));
    else renderReading(word, $('reading'));
    $('letter').setAttribute('aria-label', picture ? '拿起圖片信件' : `拿起注音信件：${word.zhuyin.join('，')}`);
    state.choices = choicesFor(word, state.activePool);
    renderMailboxes(state.choices);
    $('receipt').hidden = true; $('postmark').classList.remove('is-stamping');
    $('receipt').querySelectorAll('.stamp-dots').forEach(el => el.remove());
    $('nextButton').hidden = true; $('replayButton').hidden = false;
    $('ghost').hidden = state.index !== 0;   // 示範手指只在第一封
    const letter = $('letter');
    letter.hidden = false; letter.classList.remove('is-armed', 'is-dragging'); letter.style.opacity = '';
    setOrigin(LW / 2, LH / 2); letterPhys.x.v = letterPhys.y.v = 0;
    layout();
    resetCourier();
    // 新信從角色手上「拋」出來：彈簧從角色位置帶速度落到原位
    const a = actorImg.getBoundingClientRect(), ap = toWorld(a.left + a.width * .6, a.top + a.height * .5);
    letterPhys.x.v = ap.x - (L.letter[0] + LW / 2); letterPhys.y.v = ap.y - (L.letter[1] + LH / 2);
    letterPhys.s.v = .25; letterPhys.tilt.v = -25; letterPhys.y.vel = -300;
    ['x', 'y', 's'].forEach(k => { letterPhys[k].to = k === 's' ? 1 : 0; });
    animate(actor, { opacity: 1 }, { duration: dur(.3) });   // 每封都由 Motion 淡入（再送一次時才不會停在淡出狀態）
    say(picture ? '看圖片，送到郵箱' : '讀注音，送到郵箱', 3000, false);
    if (state.audio) state.audio.pause();
    if (state.autoAudio) playPrompt();
  }

  // ---------- 作答 ----------
  function answer(word, box) {
    if (state.phase !== 'question') return;
    state.attempts++;
    if (word.id !== state.round[state.index].id) {
      // 郵筒搖頭（阻尼擺動），信被頂回去（帶初速度的彈簧）
      animate(body(box), { rotate: [0, -12, 10, -6, 3.5, -1.5, 0] }, { duration: dur(.7), ease: 'easeOut' });
      const r = box.getBoundingClientRect(), l = $('letter').getBoundingClientRect();
      letterPhys.y.vel += 900; letterPhys.x.vel += clamp((l.left + l.width / 2 - (r.left + r.width / 2)) / K * 4, -700, 700);
      letterPhys.tilt.vel += (Math.random() < .5 ? -1 : 1) * 260;
      vibrate([20, 40, 20]);
      playSound('wrong'); say('再試一次', 1800);
      return;
    }
    deliver(box);
  }
  async function deliver(box) {
    const word = state.round[state.index], index = state.index;
    state.phase = 'posting'; state.armed = false;
    const firstTry = state.attempts === 1;
    state.streak = firstTry ? state.streak + 1 : 0;
    state.firstTry += Number(firstTry);
    state.answerResults[index] = firstTry;
    state.progressResults.push(DinoProgress.record(word.id, firstTry));
    if (state.audio) state.audio.pause();
    vibrate(30);
    playSound('correct');
    if (state.dino) setTimeout(() => Dino.sfx('dino-chirp', .7), 450);   // 恐龍模式：答對多一聲小恐龍叫
    $('ghost').hidden = true;
    document.querySelectorAll('.mailbox').forEach(b => { b.disabled = true; b.classList.remove('armed-hint', 'dim'); b.classList.toggle('mouth', b === box); });
    $('replayButton').hidden = true;
    // 1. 信整體縮小、飛進投信口
    const letter = $('letter'), slot = box.querySelector('.pb-slot');
    letter.classList.remove('is-armed', 'is-dragging');
    const lc = centerOf(letter), sc = centerOf(slot), s0 = letterPhys.s.v, S = .14;
    const tx = letterPhys.x.v + (sc.x - lc.x) - (S - s0) * (LW / 2 - letterO.x), ty = letterPhys.y.v + (sc.y - lc.y) - (S - s0) * (LH / 2 - letterO.y);
    await animate(letter, { transform: [letter.style.transform || 'none', `translate3d(${tx}px,${ty}px,0) scale(${S})`], opacity: [1, 1, 0] },
      { duration: dur(.42), ease: [.3, .7, .3, 1] }).finished;
    if (state.phase !== 'posting' || state.index !== index) return;   // 中途從設定重新開始
    letter.hidden = true;
    // 2. 吞信：郵筒壓扁回彈 → 黃旗阻尼擺動後立起
    box.classList.remove('mouth');
    animate(body(box), { scaleX: [1, 1.1, .97, 1.02, 1], scaleY: [1, .86, 1.06, .98, 1] }, { duration: dur(.6), ease: 'easeOut' });
    const flag = box.querySelector('.pb-flag'), sign = box.matches(':nth-child(2)') ? -1 : 1;
    flag.style.opacity = '1';
    animate(flag, { transform: [90, -24, 14, -7, 3, 0].map(d => `rotate(${d * sign}deg)`) }, { duration: dur(.9), ease: 'easeOut' });
    Dino.burst(body(box));
    pose(courier().cheer);
    bob.animate([{ translate: '0 0' }, { translate: '0 -16px' }, { translate: '0 0' }], { duration: dur(.42) * 1000, easing: 'ease-out' });
    // 3. 收件確認卡＋DINO POST 郵戳（stamp 音效在 stampDown 64% 落下；卡片被壓一下）
    await wait(260);
    if (state.phase !== 'posting' || state.index !== index) return;
    setKidText($('receiptZh'), word.zh, word.zhuyin);
    $('receiptZh').classList.toggle('is-long', word.zh.length > 3);
    $('receiptEn').textContent = word.en;
    $('receiptEn').after(DinoStampsUI.dots(state.progressResults.at(-1)));
    $('receipt').hidden = false;
    await animate($('receipt'), { opacity: [0, 1], transform: ['translateY(30px) scale(.9)', 'translateY(0) scale(1)'] }, { type: 'spring', stiffness: 230, damping: 19, duration: dur(.5) }).finished;
    $('postmark').classList.add('is-stamping');
    await wait(330);
    if (state.phase !== 'posting' || state.index !== index) return;
    playSound('stamp');
    animate($('receipt'), { transform: ['translateY(0) scale(1)', 'translateY(5px) scale(.965,.94)', 'translateY(-2px) scale(1.01)', 'translateY(0) scale(1)'] }, { duration: dur(.4), ease: 'easeOut' });
    state.phase = 'reveal';
    say(DinoStampsUI.message(state.progressResults.at(-1)) || (state.streak >= Dino.streakThreshold ? '連續送對！' : '送達啦！'), 1800);
    setKidText($('nextLabel'), state.index === state.count - 1 ? '看成果' : '下一封');
    $('nextButton').hidden = false;
    animate($('nextButton'), { scale: [.5, 1] }, { type: 'spring', stiffness: 400, damping: 14, duration: dur(.5) });
    renderProgress(state.index + 1);
  }
  async function next() {
    if (state.phase !== 'reveal') return;
    state.phase = 'leaving';
    $('nextButton').hidden = true;
    animate($('status'), { opacity: 0 }, { duration: dur(.2) });
    await animate(actor, { opacity: [1, 0] }, { duration: dur(.25) }).finished;
    if (state.phase !== 'leaving') return;
    state.index++;
    if (state.index >= state.count) { playSound('finish'); if (state.dino) setTimeout(() => Dino.sfx('dino-roar', .8), 900); finishRound(); return; }
    renderQuestion();
  }

  // ---------- 回合紀錄 ----------
  function saveRound() {
    try {
      const history = Dino.loadHistory();
      const record = { date: new Date().toISOString(), game: 'zhuyin-sort', format: state.format, mode: state.mode, level: state.level,
        score: state.firstTry, total: state.count, ids: state.round.map(word => word.id), results: [...state.answerResults] };
      localStorage.setItem(Dino.storageKeys.history, JSON.stringify([record, ...history].slice(0, 10)));
    } catch { /* The game still works when local storage is unavailable. */ }
  }
  function finishRound() {
    state.phase = 'finish';
    $('finishScore').setAttribute('aria-label', `第一次就送對 ${state.firstTry}／${state.count} 封`);
    $('finishScore').replaceChildren(makeKidSpan('第一次就送對'), document.createTextNode(` ${state.firstTry}／${state.count} `), makeKidSpan('封'));
    $('finishOverlay').hidden = false;
    animate(document.querySelector('.finish-card'), { opacity: [0, 1], scale: [.8, 1] }, { type: 'spring', stiffness: 190, damping: 16, duration: dur(.6) });
    saveRound();
    DinoStampsUI.showRoundStamps($('stampSummary'), state.progressResults, state.words, albumLink);
  }

  // ---------- 拖信：往上拉時整封縮小（transform，注音字同比縮）、依速度擺盪；進入郵筒 100px 磁吸，放手就投 ----------
  function initDrag() {
    const letter = $('letter');
    letter.addEventListener('pointerdown', () => { $('ghost').hidden = true; });
    interact('#letter').draggable({
      inertia: false, autoScroll: false,
      listeners: {
        start(event) {
          if (state.phase !== 'question') return;
          state.dragging = true; state.armed = true;
          const r = letter.getBoundingClientRect(), s = letterPhys.s.v;
          // 以手指位置為縮放與擺盪的支點，縮小後信仍在指尖下
          setOrigin((event.clientX - r.left) / (s * K), (event.clientY - r.top) / (s * K));
          letter.classList.add('is-dragging', 'is-armed');
          document.querySelectorAll('.mailbox').forEach(b => b.classList.remove('armed-hint'));
          drag = { vx: 0, lastT: performance.now() };
        },
        move(event) {
          if (state.phase !== 'question' || !state.dragging) return;
          const now = performance.now(), dt = Math.max(8, now - drag.lastT) / 1000, dx = event.dx / K, dy = event.dy / K;
          drag.vx = drag.vx * .5 + (dx / dt) * .5; drag.lastT = now;
          letterPhys.x.v += dx; letterPhys.y.v += dy;
          letterPhys.x.vel = dx / dt; letterPhys.y.vel = dy / dt;
          const lift = clamp(-letterPhys.y.v / L.lift, 0, 1);
          letterPhys.s.v = 1 - .5 * lift; letterPhys.s.vel = 0;
          letter.style.transform = `translate3d(${letterPhys.x.v}px, ${letterPhys.y.v}px, 0) scale(${letterPhys.s.v})`;
        },
        end() {
          if (!state.dragging) return;
          state.dragging = false; state.dragEndAt = performance.now();   // 放手時瀏覽器還會送一次 click，不要再說「選一個郵箱」
          letter.classList.remove('is-dragging');
          // 放開後交給彈簧：帶著手指速度飛回原位、恢復原大小
          letterPhys.x.vel = clamp(letterPhys.x.vel, -1500, 1500) * .5; letterPhys.y.vel = clamp(letterPhys.y.vel, -1500, 1500) * .5;
          const i = state.magnet;   // 放手時在磁吸範圍內＝投到那個郵筒
          if (state.phase === 'question' && i >= 0) {
            const box = document.querySelectorAll('.mailbox')[i], word = state.choices.find(item => item.id === box.dataset.wordId);
            if (word) answer(word, box);
          }
        }
      }
    });
    letter.addEventListener('click', () => {
      if (state.phase !== 'question' || state.dragging || performance.now() - (state.dragEndAt || 0) < 400) return;
      state.armed = true; letter.classList.add('is-armed');
      say('選一個郵箱', 2200);
      document.querySelectorAll('.mailbox').forEach(b => { b.classList.add('armed-hint'); });
      letterPhys.y.vel -= 360; letterPhys.s.vel += 2.4; letterPhys.tilt.vel -= 120;   // 信被拿起來彈一下
    });
    letter.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); letter.click(); } });
  }

  function startRound() {
    if (!state.words.length) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(disabledStorageKey) || '[]');
      if (Array.isArray(saved)) state.disabledIds = new Set(saved);
    } catch { /* Keep current word bank. */ }
    const pool = Dino.eligibleWords(state.words, state.disabledIds, state.nextMode, state.nextLevel, 'zhuyin');   // 注音送信看注音等級
    const usable = pool.filter(word => new Set(distractorPools(word, pool).flat().map(other => other.zh)).size >= 2);
    if (usable.length < state.nextCount) { say('可用單字不足', 0, false); return false; }
    state.mode = state.nextMode; state.level = state.nextLevel; state.count = state.nextCount; state.autoAudio = state.nextAutoAudio; state.format = state.nextFormat;
    state.activePool = pool;
    state.round = Dino.selectRound(usable, Dino.loadHistory(), state.count);
    state.index = 0; state.firstTry = 0; state.streak = 0; state.answerResults = []; state.progressResults = [];
    // 每回合換下一張背景、下一位起手送信角色
    const rotation = loadRotation();
    state.bg = rotation.bg; state.courier = rotation.courier;
    try { localStorage.setItem(rotationStorageKey, JSON.stringify({ bg: rotation.bg + 1, courier: rotation.courier + state.count })); } catch { /* ok */ }
    applyBackground();
    $('finishOverlay').hidden = true;
    renderQuestion();
    return true;
  }

  const albumLink = DinoStampsUI.albumLink();
  document.querySelector('.finish-actions').append(albumLink);
  async function init() {
    [['readyTitle', '點一下，開始送信！'],
      ['finishCopy', '信都送到了！'], ['finishTitle', '送信任務完成'], ['playAgainButton', '再送一次'], ['finishHome', '回首頁'],
      ['receiptBrand', '恐龍郵局'], ['receiptConfirm', '收件確認'], ['nextLabel', '下一封']]
      .forEach(([id, text]) => setKidText($(id), text));
    state.bg = loadRotation().bg; applyBackground();
    $('settingsButton').addEventListener('click', () => $('settingsDialog').showModal());
    if (new URLSearchParams(location.search).has('settings')) $('settingsDialog').showModal();
    $('closeSettings').addEventListener('click', () => $('settingsDialog').close());
    $('restartFromSettings').addEventListener('click', () => { $('settingsDialog').close(); startRound(); });
    document.querySelectorAll('.mail-mode-option').forEach(button => button.addEventListener('click', () => {
      if (['all', 'level', 'dinosaur'].includes(button.dataset.mailMode)) setSelection({ nextMode: Dino.taskMode(button.dataset.mailMode) });
    }));
    document.querySelectorAll('.mail-format-option').forEach(button => button.addEventListener('click', () => setSelection({ nextFormat: button.dataset.mailFormat === 'picture' ? 'picture' : 'zhuyin' })));
    $('mailAutoAudio').addEventListener('change', event => setSelection({ nextAutoAudio: event.target.checked }));
    $('mailCount').addEventListener('input', event => setSelection({ nextCount: clamp(Number(event.target.value) || 5, 3, 10) }));
    $('mailLevelSlider').addEventListener('input', event => setSelection({ nextLevel: clamp(Number(event.target.value) || 1, 1, 3) }));
    $('nextButton').addEventListener('click', next);
    $('replayButton').addEventListener('click', () => { playPrompt(); animate($('replayButton'), { scale: [1, .82, 1.1, 1] }, { duration: dur(.4) }); });
    $('playAgainButton').addEventListener('click', startRound);
    $('readyOverlay').addEventListener('click', () => {
      $('readyOverlay').hidden = true; Dino.sfx('pop', .6);
      if (state.phase === 'question') playPrompt();
    });
    initDrag();
    addEventListener('resize', layout);
    layout();
    requestAnimationFrame(frame);
    say('信件準備中', 0, false);
    try {
      const [cast, words] = await Promise.all(['assets/cast/cast.json', 'data.json'].map(url => fetch(url).then(r => {
        if (!r.ok) throw Error(`HTTP ${r.status} ${url}`);
        return r.json();
      })));
      state.cast = cast; state.words = words;
      couriers.forEach(c => [c.idle, c.walk, c.cheer].forEach(p => { new Image().src = cast[c.id].poses[p].src; }));
      state.courier = loadRotation().courier; resetCourier();
      try {
        const saved = JSON.parse(localStorage.getItem(selectionStorageKey) || 'null');
        if (['all', 'level', 'dinosaur'].includes(saved?.mode)) state.nextMode = saved.mode;
        if (Number.isInteger(saved?.level) && saved.level >= 1 && saved.level <= 3) state.nextLevel = saved.level;
        if (saved?.format === 'picture') state.nextFormat = 'picture';
        if (typeof saved?.autoAudio === 'boolean') state.nextAutoAudio = saved.autoAudio;
        if (Number.isInteger(saved?.count) && saved.count >= 3 && saved.count <= 10) state.nextCount = saved.count;
      } catch { /* Keep default selection. */ }
      state.nextMode = Dino.taskMode(state.nextMode);
      renderSelectionControls();
      const allIds = new Set(state.words.map(word => word.id));
      try {
        const disabled = JSON.parse(localStorage.getItem(disabledStorageKey) || '[]');
        if (Array.isArray(disabled)) state.disabledIds = new Set(disabled.filter(id => allIds.has(id)));
      } catch { /* Ignore invalid saved settings. */ }
      startRound();   // 直接開始；自動發音被手機擋下時 playPrompt 才蓋上「點一下開始」
    } catch (error) {
      console.error(error);
      say('題庫載入失敗', 0, false);
    }
  }
  init();
})();
