const $ = (id) => document.getElementById(id);
const screens = ['startScreen', 'playScreen', 'resultScreen'];
const state = { words: [], disabledIds: new Set(), roundChoices: [], count: 5, mode: 'all', level: 1, answerFormat: 'image', autoAudio: true, round: [], pendingRound: [], index: 0, firstTryScore: 0, streak: 0, attempts: 0, results: [], phase: 'start', audio: null, chineseAudio: null, previewAudio: null, loadedWordId: null, completedRounds: 0, screenCasts: { start: [], play: [], result: [] }, characterQueue: [], history: [] };
const bankStorageKey = Dino.storageKeys.disabled;
const characterStorageKey = 'dinopost-character-queue-v2';
const answerStorageKey = 'dinopost-match-answer-v1';
const { characters, shuffle, visualGroup, audioPath, parseZhuyin, makeBpmUnit } = Dino;
function saveCharacterQueue() {
  try { localStorage.setItem(characterStorageKey, JSON.stringify(state.characterQueue)); } catch {}
}
const loadCharacterQueue = () => Dino.loadQueue(characterStorageKey);
function setActorPose(actor, pose) {
  const character = characters.find(item => item.id === actor.dataset.character);
  if (!character) return;
  actor.style.backgroundPosition = pose === 'celebrate' ? '100% 0' : pose === 'listen' && character.frames === 3 ? '50% 0' : '0 0';
}
function fitActor(actor) {
  const character = characters.find(item => item.id === actor.dataset.character);
  if (character) Dino.fitActor(actor, character.ratio);
}
function fitVisibleActors() {
  document.querySelectorAll('.spotlight-actor').forEach(fitActor);
}
function renderScreenCast(screen) {
  state.screenCasts[screen].forEach((characterId, index) => {
    const character = characters.find(item => item.id === characterId);
    const slot = ['A', 'B', 'C'][index];
    const actor = $(`${screen}Actor${slot}`);
    actor.style.backgroundImage = `url('assets/${character.asset}')`;
    actor.style.backgroundSize = `${character.frames * 100}% 100%`;
    actor.dataset.character = character.id;
    actor.title = character.name;
    setActorPose(actor, screen === 'result' ? 'celebrate' : screen === 'play' && slot === 'A' ? 'listen' : 'idle');
    fitActor(actor);
  });
}
function advanceCast(screen) {
  const next = [];
  while (next.length < 3) {
    if (!state.characterQueue.length) state.characterQueue = shuffle(characters.map(character => character.id).filter(id => !next.includes(id)));
    const id = state.characterQueue.shift();
    if (!next.includes(id)) next.push(id);
  }
  state.screenCasts[screen] = next;
  saveCharacterQueue();
  renderScreenCast(screen);
}

function showScreen(id) {
  screens.forEach(name => $(name).classList.toggle('hidden', name !== id));
  requestAnimationFrame(fitVisibleActors);
}
const actorObserver = new ResizeObserver(() => requestAnimationFrame(fitVisibleActors));
document.querySelectorAll('.spotlight-actor').forEach(actor => actorObserver.observe(actor.parentElement));
const actorImages = characters.map(character => {
  const image = new Image();
  let retried = false;
  image.addEventListener('load', () => {
    document.querySelectorAll(`[data-character="${character.id}"]`).forEach(actor => {
      actor.style.backgroundImage = `url('${image.src}')`;
    });
    fitVisibleActors();
  });
  image.addEventListener('error', () => {
    if (!retried) {
      retried = true;
      setTimeout(() => { image.src = `assets/${character.asset}?retry=1`; }, 400);
    } else console.warn('角色圖片載入失敗', character.asset);
  });
  image.src = `assets/${character.asset}`;
  return image;
});
function currentWord() { return state.round[state.index]; }
function eligibleWords() {
  return Dino.eligibleWords(state.words, state.disabledIds, state.mode, state.level);
}
const wordBreaks = {
  watermelon: ['water', 'melon'], toothbrush: ['tooth', 'brush'], pineapple: ['pine', 'apple'],
  strawberry: ['straw', 'berry'], hamburger: ['ham', 'burger'], butterfly: ['butter', 'fly'],
  allosaurus: ['allo', 'saurus'], ankylosaurus: ['ankylo', 'saurus'],
  archaeopteryx: ['archaeo', 'pteryx'], brachiosaurus: ['brachio', 'saurus'],
  carnotaurus: ['carno', 'taurus'], compsognathus: ['compso', 'gnathus'],
  corythosaurus: ['corytho', 'saurus'], dilophosaurus: ['dilo', 'phosaurus'],
  diplodocus: ['diplo', 'docus'], giganotosaurus: ['giganto', 'saurus'],
  ichthyosaurus: ['ichthyo', 'saurus'], iguanodon: ['iguano', 'don'],
  mamenchisaurus: ['mamenchi', 'saurus'], microraptor: ['micro', 'raptor'],
  mosasaurus: ['mosa', 'saurus'], oviraptor: ['ovi', 'raptor'],
  pachycephalosaurus: ['pachy', 'cephalo', 'saurus'],
  parasaurolophus: ['para', 'sauro', 'lophus'], plesiosaurus: ['plesio', 'saurus'],
  protoceratops: ['proto', 'ceratops'], pteranodon: ['ptera', 'nodon'],
  spinosaurus: ['spino', 'saurus'], stegosaurus: ['stego', 'saurus'],
  therizinosaurus: ['therizino', 'saurus'], triceratops: ['tri', 'ceratops'],
  tyrannosaurus: ['tyranno', 'saurus'], velociraptor: ['veloci', 'raptor'],
  quetzalcoatlus: ['quetzal', 'coatlus'], hatzegopteryx: ['hatzego', 'pteryx'],
  deinonychus: ['deino', 'nychus'], edmontosaurus: ['edmonton', 'saurus'],
  maiasaura: ['maia', 'saura']
};
function showEnglishWord(word) {
  const element = $('englishWord');
  const parts = wordBreaks[word.en] || (word.en.length > 12
    ? [word.en.slice(0, Math.ceil(word.en.length / 2)), word.en.slice(Math.ceil(word.en.length / 2))]
    : [word.en]);
  element.replaceChildren();
  parts.forEach((part, index) => {
    if (index) element.append(document.createElement('wbr'));
    element.append(document.createTextNode(part));
  });
  element.setAttribute('aria-label', word.en);
  element.classList.toggle('long-word', word.en.length > 7);
  element.classList.toggle('very-long-word', word.en.length > 15);
  element.classList.toggle('dinosaur-word', word.category === 'dinosaur');
  element.classList.remove('zhuyin-question', 'long-reading');
}
function showPicturePrompt(word) {
  const element = $('englishWord');
  element.className = 'parcel-prompt';
  element.setAttribute('aria-label', `包裹封面圖片：${word.zh}`);
  const cover = document.createElement('span'); cover.className = 'parcel-cover';
  const art = document.createElement(word.image && word.category !== 'number' ? 'img' : 'span');
  art.className = 'parcel-art';
  if (word.image && word.category !== 'number') { art.src = word.image; art.alt = ''; }
  else if (word.sheet && Number.isInteger(word.cell)) {
    art.classList.add('parcel-sheet');
    art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.jpg')`;
    art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
  } else art.textContent = word.emoji;
  cover.append(art); element.replaceChildren(cover);
}
function clearParcelDelivery() {
  document.querySelector('.parcel-delivery')?.remove();
  $('englishWord').classList.remove('parcel-sent');
}
function sendParcel() {
  const source = $('englishWord').querySelector('.parcel-cover');
  const board = document.querySelector('.game-board');
  if (!source || !board) return;
  clearParcelDelivery();
  const from = source.getBoundingClientRect();
  const frame = board.getBoundingClientRect();
  const parcel = document.createElement('div');
  parcel.className = 'parcel-delivery';
  parcel.style.left = `${from.left - frame.left}px`;
  parcel.style.top = `${from.top - frame.top}px`;
  parcel.style.width = `${from.width}px`;
  parcel.style.height = `${from.height}px`;
  parcel.append(source.cloneNode(true));
  const stamp = document.createElement('span');
  stamp.className = 'parcel-delivery-stamp';
  stamp.setAttribute('aria-hidden', 'true');
  stamp.textContent = '✓';
  parcel.append(stamp);
  board.append(parcel);
  $('englishWord').classList.add('parcel-sent');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dx = frame.right - from.right + from.width * .3;
  const dy = frame.top - from.top - from.height * .5;
  const flight = parcel.animate(reduced ? [
    { opacity: 1 }, { opacity: 0 }
  ] : [
    { offset: 0, transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
    { offset: .2, transform: 'translate(0,5px) rotate(-6deg) scale(1.08)', opacity: 1 },
    { offset: .38, transform: 'translate(0,-16px) rotate(5deg) scale(1)', opacity: 1 },
    { offset: 1, transform: `translate(${dx}px,${dy}px) rotate(18deg) scale(.38)`, opacity: 0 }
  ], { duration: reduced ? 120 : 1100, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' });
  flight.finished.then(() => parcel.remove()).catch(() => parcel.remove());
}
function showZhuyinPrompt(word) {
  const element = $('englishWord');
  element.className = 'zhuyin-question';
  if (word.zhuyin.length > 4) element.classList.add('long-reading');
  element.setAttribute('aria-label', `注音：${word.zhuyin.join('、')}`);
  element.replaceChildren(...word.zhuyin.map(reading => {
    const span = document.createElement('span'); span.className = 'prompt-syllable'; span.lang = 'zh-Bopo';
    const { onset, rime, tone } = parseZhuyin(reading);
    span.textContent = `${onset}${rime.join('')}`;
    if (tone) {
      const mark = document.createElement('span'); mark.className = `prompt-tone${tone === '˙' ? ' light' : ''}`;
      mark.textContent = tone; span.append(mark);
    }
    return span;
  }));
}

// Recorded effects shared with the mail game (assets/audio/effects/).
const effectFiles = {
  correct: new Audio('assets/audio/effects/correct.mp3'),
  wrong: new Audio('assets/audio/effects/wrong.mp3'),
  finish: new Audio('assets/audio/effects/finish.mp3')
};
Object.values(effectFiles).forEach(sound => { sound.preload = 'auto'; sound.volume = .9; });
function stopEffect() {
  Object.values(effectFiles).forEach(sound => sound.pause());
}
function playEffect(kind) {
  stopEffect();
  const sound = effectFiles[kind];
  if (!sound) return;
  try { sound.currentTime = 0; } catch {}
  sound.play().catch(error => console.warn('音效無法播放', error));
}
const uiReadings = {
  '聽單字，': ['ㄊㄧㄥ', 'ㄉㄢ', 'ㄗˋ', ''],
  '聽英文，': ['ㄊㄧㄥ', 'ㄧㄥ', 'ㄨㄣˊ', ''],
  '找單字！': ['ㄓㄠˇ', 'ㄉㄢ', 'ㄗˋ', ''],
  '找單字': ['ㄓㄠˇ', 'ㄉㄢ', 'ㄗˋ'],
  '看包裹圖片，選英文單字。': ['ㄎㄢˋ','ㄅㄠ','ㄍㄨㄛˇ','ㄊㄨˊ','ㄆㄧㄢˋ','','ㄒㄩㄢˇ','ㄧㄥ','ㄨㄣˊ','ㄉㄢ','ㄗˋ',''],
  '選單字': ['ㄒㄩㄢˇ','ㄉㄢ','ㄗˋ'],
  '聽英文': ['ㄊㄧㄥ','ㄧㄥ','ㄨㄣˊ'],
  '讀注音，': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ', ''],
  '找英文！': ['ㄓㄠˇ', 'ㄧㄥ', 'ㄨㄣˊ', ''],
  '讀注音，選英文。': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ', '', 'ㄒㄩㄢˇ', 'ㄧㄥ', 'ㄨㄣˊ', ''],
  '答題方式': ['ㄉㄚˊ', 'ㄊㄧˊ', 'ㄈㄤ', 'ㄕˋ'],
  '聽英文，找圖片': ['ㄊㄧㄥ', 'ㄧㄥ', 'ㄨㄣˊ', '', 'ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
  '讀注音，找英文': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ', '', 'ㄓㄠˇ', 'ㄧㄥ', 'ㄨㄣˊ'],
  '自動發音': ['ㄗˋ', 'ㄉㄨㄥˋ', 'ㄈㄚ', 'ㄧㄣ'],
  '找英文': ['ㄓㄠˇ', 'ㄧㄥ', 'ㄨㄣˊ'],
  '找圖片': ['ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
  '讀注音': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ'],
  '選英文': ['ㄒㄩㄢˇ', 'ㄧㄥ', 'ㄨㄣˊ'],
  '找圖片！': ['ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', ''],
  '聽英文，選圖片。': ['ㄊㄧㄥ', 'ㄧㄥ', 'ㄨㄣˊ', '', 'ㄒㄩㄢˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', ''],
  '選任務': ['ㄒㄩㄢˇ', 'ㄖㄣˋ', 'ㄨˋ'],
  '全部': ['ㄑㄩㄢˊ', 'ㄅㄨˋ'],
  '分難度': ['ㄈㄣ', 'ㄋㄢˊ', 'ㄉㄨˋ'],
  '恐龍挑戰': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄊㄧㄠˇ', 'ㄓㄢˋ'],
  '第一級': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ'],
  '第二級': ['ㄉㄧˋ', 'ㄦˋ', 'ㄐㄧˊ'],
  '第三級': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄐㄧˊ'],
  '第': ['ㄉㄧˋ'],
  '共': ['ㄍㄨㄥˋ'],
  '一次答對': ['ㄧˊ', 'ㄘˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ'],
  '今日任務': ['ㄐㄧㄣ', 'ㄖˋ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第一級任務': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第二級任務': ['ㄉㄧˋ', 'ㄦˋ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第三級任務': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '開始任務': ['ㄎㄞ', 'ㄕˇ', 'ㄖㄣˋ', 'ㄨˋ'],
  '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
  '聽單字': ['ㄊㄧㄥ', 'ㄉㄢ', 'ㄗˋ'],
  '再聽一次': ['ㄗㄞˋ', 'ㄊㄧㄥ', 'ㄧˊ', 'ㄘˋ'],
  '再聽': ['ㄗㄞˋ', 'ㄊㄧㄥ'],
  '選圖片': ['ㄒㄩㄢˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
  '選數字': ['ㄒㄩㄢˇ', 'ㄕㄨˋ', 'ㄗˋ'],
  '再試一次！': ['ㄗㄞˋ', 'ㄕˋ', 'ㄧˊ', 'ㄘˋ', ''],
  '答對了！': ['ㄉㄚˊ', 'ㄉㄨㄟˋ', 'ㄌㄜ˙', ''],
  '連續答對！': ['ㄌㄧㄢˊ', 'ㄒㄩˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ', ''],
  '下一題': ['ㄒㄧㄚˋ', 'ㄧˋ', 'ㄊㄧˊ'],
  '看成績': ['ㄎㄢˋ', 'ㄔㄥˊ', 'ㄐㄧˋ'],
  '今天的郵件': ['ㄐㄧㄣ', 'ㄊㄧㄢ', 'ㄉㄜ˙', 'ㄧㄡˊ', 'ㄐㄧㄢˋ'],
  '送達啦！': ['ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
  '星星郵件': ['ㄒㄧㄥ', 'ㄒㄧㄥ', 'ㄧㄡˊ', 'ㄐㄧㄢˋ'],
  '也送達啦！': ['ㄧㄝˇ', 'ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
  '第一次就答對': ['ㄉㄧˋ', 'ㄧ', 'ㄘˋ', 'ㄐㄧㄡˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ'],
  '題': ['ㄊㄧˊ'],
  '你完成任務了！': ['ㄋㄧˇ', 'ㄨㄢˊ', 'ㄔㄥˊ', 'ㄖㄣˋ', 'ㄨˋ', 'ㄌㄜ˙', ''],
  '星星郵票送給你！': ['ㄒㄧㄥ', 'ㄒㄧㄥ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', 'ㄙㄨㄥˋ', 'ㄍㄟˇ', 'ㄋㄧˇ', ''],
  '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧˊ', 'ㄘˋ'],
  '聽中文': ['ㄊㄧㄥ', 'ㄓㄨㄥ', 'ㄨㄣˊ']
};
const setKidText = Dino.kidText(uiReadings);
function annotateStaticUI() {
  const pairs = [
    ['startTitleLine1', '聽單字，'], ['startTitleLine2', '找圖片！'],
    ['startDescription', '聽英文，選圖片。'], ['modeLegend', '選任務'], ['answerLegend', '答題方式'],
    ['questionTag', '聽單字'], ['resultScoreLabel', '第一次就答對'],
    ['resultCountUnit', '題'],
  ];
  pairs.forEach(([id, label]) => setKidText($(id), label));
  document.querySelectorAll('.mode-option').forEach(button => {
    const label = button.querySelector('.mode-label');
    setKidText(label, label.textContent.trim());
  });
  document.querySelectorAll('.answer-option').forEach(button => setKidText(button, button.textContent.trim()));
  setKidText(document.querySelector('#autoAudioControl .switch-label'), '自動發音');
  document.querySelectorAll('.home-label').forEach(label => setKidText(label, '回首頁'));
  setKidText(document.querySelector('.start-label'), '開始任務');
  setKidText(document.querySelector('.replay-label'), '再聽');
  setKidText(document.querySelector('.again-label'), '再玩一次');
  setKidText($('instruction'), '選圖片');
  setKidText($('resultTitleLine1'), '今天的郵件');
  setKidText($('resultTitleLine2'), '送達啦！');
  setKidText($('resultCopy'), '你完成任務了！');
  setKidText($('levelText'), '第一級');
}
function primeWordAudio(word) {
  if (!word) return;
  if (!state.audio) {
    state.audio = new Audio();
    state.audio.preload = 'auto';
  }
  if (state.loadedWordId !== word.id) {
    state.audio.pause();
    state.audio.src = audioPath(word);
    state.loadedWordId = word.id;
    state.audio.load();
  }
}
function playWord(word = currentWord()) {
  if (!word) return;
  primeWordAudio(word);
  state.audio.currentTime = 0;
  state.audio.play().then(() => { $('audioStatus').textContent = ''; }).catch(() => {
    $('audioStatus').textContent = '點「再聽一次」播放發音';
  });
}
function playChinese(word = currentWord()) {
  if (!word?.zhAudio) return;
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  if (state.chineseAudio) { state.chineseAudio.pause(); state.chineseAudio.currentTime = 0; }
  state.chineseAudio = new Audio(word.zhAudio);
  state.chineseAudio.play().catch(() => { $('audioStatus').textContent = '點正確卡片重聽中文'; });
}
const loadHistory = Dino.loadHistory;
function saveHistory() {
  try { localStorage.setItem(Dino.storageKeys.history, JSON.stringify(state.history.slice(0, 10))); }
  catch { /* The game remains playable when browser storage is unavailable. */ }
}
function selectRound(pool) { return Dino.selectRound(pool, state.history, state.count); }
function prepareRound() {
  if (!state.words.length) return;
  state.pendingRound = selectRound(eligibleWords());
  if (state.pendingRound.length) primeWordAudio(state.pendingRound[0]);
}
function updateScoreText() {
  const label = document.createElement('span');
  setKidText(label, '一次答對');
  const count = document.createElement('strong'); count.textContent = String(state.firstTryScore);
  $('scoreText').replaceChildren(label, count);
  $('scoreText').setAttribute('aria-label', `第一次答對 ${state.firstTryScore} 題`);
}
function updateProgressText() {
  const prefix = document.createElement('span'); setKidText(prefix, '第');
  const unit = document.createElement('span'); setKidText(unit, '題');
  const total = document.createElement('span'); total.className = 'progress-total';
  total.textContent = `／${state.round.length}`;
  $('progressText').replaceChildren(prefix, document.createTextNode(String(state.index + 1)), unit, total);
  $('progressText').setAttribute('aria-label', `第 ${state.index + 1} 題，共 ${state.round.length} 題`);
}
function updateProgress() {
  updateProgressText();
  updateScoreText();
  $('progressDots').replaceChildren(...state.round.map((_, i) => {
    const dot = document.createElement('span'); dot.className = 'dot';
    if (i < state.index) dot.classList.add(state.results[i] ? 'correct' : 'wrong');
    if (i === state.index) dot.classList.add('current');
    return dot;
  }));
}
function drawChoices(word) {
  const displayImage = item => item.category === 'number' ? null : item.image;
  const uniqueOptions = items => {
    const meanings = new Set([word.zh]);
    const images = new Set(displayImage(word) ? [displayImage(word)] : []);
    const readings = new Set([word.zhuyin.join('|')]);
    return shuffle(items).filter(item => {
      const image = displayImage(item);
      if (meanings.has(item.zh) || (image && images.has(image)) || (state.answerFormat === 'english' && readings.has(item.zhuyin.join('|')))) return false;
      meanings.add(item.zh); readings.add(item.zhuyin.join('|'));
      if (image) images.add(image);
      return true;
    });
  };
  let pool;
  if (state.answerFormat === 'english') {
    const candidates = state.roundChoices.filter(item => item.id !== word.id
      && (item.category === 'dinosaur') === (word.category === 'dinosaur'));
    pool = uniqueOptions(candidates.filter(item => item.category === word.category
      && (state.mode !== 'level' || item.difficulty === state.level)));
    if (pool.length < 3) pool = uniqueOptions(candidates.filter(item => state.mode !== 'level' || item.difficulty === state.level));
    if (pool.length < 3) pool = uniqueOptions(candidates);
  } else {
    pool = uniqueOptions(state.roundChoices.filter(item => item.category === word.category
      && (state.mode !== 'level' || item.difficulty === state.level)
      && visualGroup(item) === visualGroup(word) && item.id !== word.id));
    if (pool.length < 3) pool = uniqueOptions(state.roundChoices.filter(item => item.category === word.category
      && visualGroup(item) === visualGroup(word) && item.id !== word.id));
    if (pool.length < 3) pool = uniqueOptions(state.roundChoices.filter(item => (state.mode !== 'level' || item.difficulty === state.level) && visualGroup(item) === visualGroup(word) && item.id !== word.id));
    if (pool.length < 3) pool = uniqueOptions(state.roundChoices.filter(item => visualGroup(item) === visualGroup(word)
      && (item.category === 'dinosaur') === (word.category === 'dinosaur') && item.id !== word.id));
  }
  const distractors = pool.slice(0, 3);
  const options = shuffle([word, ...distractors]);
  $('choices').replaceChildren(...options.map(option => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'choice is-entering';
    button.setAttribute('aria-label', state.answerFormat === 'english' ? option.en : option.category === 'number' ? `${option.zh}的數字` : `${option.zh}的圖片`);
    button.dataset.wordId = option.id;
    const inner = document.createElement('span'); inner.className = 'choice-inner';
    const front = document.createElement('span'); front.className = 'choice-face choice-front';
    if (state.answerFormat === 'english') {
      const label = document.createElement('strong'); label.className = 'choice-english'; label.textContent = option.en;
      if (option.en.length > 9) label.classList.add('long');
      if (option.en.length > 15) label.classList.add('very-long');
      front.append(label);
    } else {
      const art = document.createElement(displayImage(option) ? 'img' : 'span');
      art.className = 'choice-art'; art.setAttribute('aria-hidden', 'true');
      if (option.category === 'number') {
        art.classList.add('number-art'); art.textContent = option.emoji;
      } else if (option.image) {
        art.classList.add('choice-image'); art.src = option.image; art.alt = '';
      } else if (option.sheet && Number.isInteger(option.cell)) {
        art.classList.add('choice-illustrated', `sheet-${option.sheet}`);
        art.style.backgroundPosition = `${(option.cell % 5) * 25}% ${option.cell < 5 ? 0 : 100}%`;
      } else art.textContent = option.emoji;
      front.append(art);
    }
    const back = document.createElement('span'); back.className = 'choice-face choice-back'; back.setAttribute('aria-hidden', 'true');
    const meaning = document.createElement('strong'); meaning.className = 'choice-meaning';
    if ([...option.zh].length > 2) meaning.classList.add('long-meaning');
    [...option.zh].forEach((hanzi, i) => {
      meaning.append(makeBpmUnit(hanzi, option.zhuyin[i]));
    });
    back.append(meaning);
    if (option.zhAudio && option.id === word.id) {
      const cue = document.createElement('span'); cue.className = 'chinese-audio-cue';
      cue.append(document.createTextNode('♫ '));
      const text = document.createElement('span'); setKidText(text, '聽中文'); cue.append(text); back.append(cue);
    }
    inner.append(front, back); button.append(inner);
    button.addEventListener('click', () => {
      if (state.phase === 'reveal' && option.id === currentWord()?.id) playChinese(option);
      else choose(button, option.id);
    });
    return button;
  }));
}
function renderQuestion(autoPlay = true) {
  if (state.chineseAudio) { state.chineseAudio.pause(); state.chineseAudio.currentTime = 0; }
  state.phase = 'question'; state.attempts = 0;
  stopEffect();
  clearParcelDelivery();
  $('mailFlight').classList.remove('flying');
  const word = currentWord();
  if (state.answerFormat === 'english') showPicturePrompt(word); else showEnglishWord(word);
  $('feedback').textContent = '';
  $('feedback').removeAttribute('aria-label');
  setKidText($('instruction'), state.answerFormat === 'english' ? '選單字' : word.category === 'number' ? '選數字' : '選圖片');
  setKidText($('questionTag'), state.answerFormat === 'english' ? '聽英文' : '聽單字');
  $('audioButton').setAttribute('aria-label', '播放英文發音');
  $('audioStatus').textContent = '';
  $('nextButton').classList.add('hidden');
  $('trayBottom').classList.remove('has-next');
  setKidText($('nextButton').querySelector('.next-label'), state.index === state.round.length - 1 ? '看成績' : '下一題');
  $('choices').classList.remove('hidden');
  for (const slot of ['A', 'B', 'C']) {
    setActorPose($(`playActor${slot}`), slot === 'A' ? 'listen' : 'idle');
    $(`playActorFrame${slot}`).classList.remove('is-reacting', 'is-celebrating', 'is-delivering');
  }
  $('questionCard').classList.remove('is-arriving');
  void $('questionCard').offsetWidth;
  $('questionCard').classList.add('is-arriving');
  updateProgress(); drawChoices(word);
  if (autoPlay && state.autoAudio) playWord();
}
function choose(button, id) {
  if (state.phase !== 'question') return;
  const correct = id === currentWord().id;
  state.attempts++;
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  if (!correct) {
    playEffect('wrong');
    button.classList.add('wrong'); button.disabled = true;
    setKidText($('feedback'), '再試一次！');
    $('playActorFrameA').classList.remove('is-reacting');
    void $('playActorFrameA').offsetWidth;
    $('playActorFrameA').classList.add('is-reacting');
    return;
  }
  playEffect('correct');
  button.classList.add('correct');
  state.phase = 'reveal';
  const firstTry = state.attempts === 1;
  state.results[state.index] = firstTry;
  if (firstTry) state.firstTryScore++;
  state.streak = firstTry ? state.streak + 1 : 0;
  Dino.burst(button);
  updateScoreText();
  if (firstTry) {
    $('scoreText').classList.remove('is-stamped');
    void $('scoreText').offsetWidth;
    $('scoreText').classList.add('is-stamped');
  }
  setKidText($('feedback'), state.streak >= Dino.streakThreshold ? '連續答對！' : '答對了！');
  $('instruction').textContent = '';
  for (const slot of ['A', 'B', 'C']) {
    setActorPose($(`playActor${slot}`), 'celebrate');
    $(`playActorFrame${slot}`).classList.remove('is-reacting');
    $(`playActorFrame${slot}`).classList.add('is-celebrating');
  }
  $('mailFlight').classList.remove('flying');
  if (state.answerFormat === 'english') sendParcel();
  else {
    void $('mailFlight').offsetWidth;
    $('mailFlight').classList.add('flying');
  }
  $('choices').querySelectorAll('button').forEach(choice => {
    const option = state.words.find(item => item.id === choice.dataset.wordId);
    choice.disabled = !(option?.id === currentWord().id && option.zhAudio);
    choice.classList.remove('wrong');
    choice.classList.add('revealed');
    choice.querySelector('.choice-back').removeAttribute('aria-hidden');
    choice.setAttribute('aria-label', option.id === currentWord().id && option.zhAudio ? `${option.zh}，點一下聽中文` : option.zh);
  });
  $('nextButton').classList.remove('hidden');
  $('trayBottom').classList.add('has-next');
}
function startRound() {
  const pool = eligibleWords();
  const eligibleIds = new Set(pool.map(word => word.id));
  state.round = state.pendingRound.length === state.count && state.pendingRound.every(word => eligibleIds.has(word.id))
    ? state.pendingRound : selectRound(pool);
  state.pendingRound = [];
  state.index = 0; state.firstTryScore = 0; state.streak = 0; state.results = [];
  // The first play call stays inside the Start button's user gesture on iOS.
  if (state.autoAudio) playWord(state.round[0]);
  advanceCast('play');
  state.roundChoices = state.words.filter(word => !state.disabledIds.has(word.id));
  const title = state.mode === 'dinosaur' ? '恐龍挑戰' : state.mode === 'level'
    ? ['第一級', '第二級', '第三級'][state.level - 1] : '今日任務';
  setKidText($('taskTitle'), title);
  showScreen('playScreen'); renderQuestion(false);
}
function nextQuestion() {
  if (state.phase !== 'reveal') return;
  state.index++;
  if (state.index >= state.round.length) {
    state.phase = 'result';
    state.history.unshift({
      date: new Date().toISOString(), mode: state.mode, level: state.level,
      answerFormat: state.answerFormat, autoAudio: state.autoAudio,
      score: state.firstTryScore, total: state.round.length,
      ids: state.round.map(word => word.id), results: [...state.results]
    });
    state.history = state.history.slice(0, 10);
    saveHistory();
    $('finalScore').textContent = `${state.firstTryScore}／${state.round.length}`;
    state.completedRounds++;
    const alternate = state.completedRounds % 2 === 0;
    $('resultScreen').classList.toggle('variant-b', alternate);
    $('resultSymbol').textContent = alternate ? '✉' : '★';
    setKidText($('resultTitleLine1'), alternate ? '星星郵件' : '今天的郵件');
    setKidText($('resultTitleLine2'), alternate ? '也送達啦！' : '送達啦！');
    setKidText($('resultCopy'), alternate ? '星星郵票送給你！' : '你完成任務了！');
    advanceCast('result');
    showScreen('resultScreen');
    playEffect('finish');
    prepareRound();
    return;
  }
  renderQuestion();
}
function goHome() {
  if (state.phase !== 'start') advanceCast('start');
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  stopEffect();
  clearParcelDelivery();
  state.phase = 'start';
  showScreen('startScreen');
  prepareRound();
}
function setCount(value) {
  state.count = Math.max(3, Math.min(10, Number(value)));
  $('questionCount').value = String(state.count);
  $('countOutput').value = String(state.count);
  $('startCount').textContent = String(state.count);
  prepareRound();
}
function bankIssue(disabledIds) {
  const active = state.words.filter(word => !disabledIds.has(word.id));
  for (const [name, pool] of [
    ['第一級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 1)],
    ['第二級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 2)],
    ['第三級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 3)],
    ['恐龍挑戰', active.filter(word => word.category === 'dinosaur')]
  ]) {
    if (pool.length < 10) return `${name}至少需要保留 10 個單字，才能支援每回合最多 10 題。`;
  }
  const groups = new Map();
  active.forEach(word => {
    const key = `${word.category === 'dinosaur' ? 'dino' : 'regular'}:${visualGroup(word)}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  if ([...groups.values()].some(count => count < 4)) return '同一種圖片樣式至少要保留 4 個單字，才能組成四張選項。';
  return '';
}
function saveBankSelection() {
  try { localStorage.setItem(bankStorageKey, JSON.stringify([...state.disabledIds])); return true; }
  catch { $('bankMessage').textContent = '這個瀏覽器無法儲存設定；重新開啟網頁後可能恢復原狀。'; return false; }
}
function bankFilterWords() {
  const query = $('bankSearch').value.trim().toLocaleLowerCase();
  const filter = $('bankFilter').value;
  return state.words.filter(word => {
    const inPool = filter === 'all' || (filter === 'dinosaur' ? word.category === 'dinosaur' : word.category !== 'dinosaur' && word.difficulty === Number(filter));
    return inPool && (!query || word.en.toLocaleLowerCase().includes(query) || word.zh.includes(query));
  });
}
function makeBankArt(word) {
  const art = document.createElement(word.image && word.category !== 'number' ? 'img' : 'span');
  art.className = 'bank-art'; art.setAttribute('aria-hidden', 'true');
  if (word.category === 'number') art.textContent = word.emoji;
  // Lazy: the bank list sits in a closed dialog, so images load only when a parent opens it.
  else if (word.image) { art.loading = 'lazy'; art.src = word.image; art.alt = ''; }
  else if (word.sheet && Number.isInteger(word.cell)) {
    art.classList.add('bank-sheet', `sheet-${word.sheet}`);
    art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
  } else art.textContent = word.emoji;
  return art;
}
function previewBankAudio(word) {
  if (state.previewAudio) { state.previewAudio.pause(); state.previewAudio.currentTime = 0; }
  state.previewAudio = new Audio(audioPath(word));
  state.previewAudio.play().catch(() => { $('bankMessage').textContent = `${word.en} 的發音暫時無法播放。`; });
}
function renderHistory() {
  const list = $('historyList');
  if (!state.history.length) {
    list.textContent = '還沒有完成的回合。';
    return;
  }
  list.replaceChildren(...state.history.map(record => {
    const row = document.createElement('div'); row.className = 'history-row';
    const label = document.createElement('strong');
    const modeName = record.mode === 'dinosaur' ? '恐龍挑戰' : record.mode === 'level'
      ? `第${['一', '二', '三'][record.level - 1]}級` : record.mode === 'zhuyin-sort' ? '第一級' : '全部單字';
    label.textContent = record.game === 'zhuyin-sort' || record.mode === 'zhuyin-sort' ? `注音送信 · ${modeName}` : `${record.answerFormat === 'english' ? '聽英文找單字' : '找圖片'} · ${modeName}`;
    const date = document.createElement('small');
    date.textContent = new Date(record.date).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
    const score = document.createElement('span');
    score.textContent = `${record.score}／${record.total} ${record.game === 'zhuyin-sort' || record.mode === 'zhuyin-sort' ? '封' : '題'}一次答對`;
    row.append(label, date, score);
    return row;
  }));
}
function renderBank() {
  if (!state.words.length) return;
  const active = state.words.filter(word => !state.disabledIds.has(word.id));
  const count = predicate => active.filter(predicate).length;
  $('settingsBankSummary').textContent = `已啟用 ${active.length}／${state.words.length} 個單字`;
  $('bankStats').replaceChildren(...[
    ['題庫總數', active.length, state.words.length],
    ...[1, 2, 3].map(level => [`第${['一', '二', '三'][level - 1]}級`, count(word => word.category !== 'dinosaur' && word.difficulty === level), state.words.filter(word => word.category !== 'dinosaur' && word.difficulty === level).length]),
    ['恐龍', count(word => word.category === 'dinosaur'), state.words.filter(word => word.category === 'dinosaur').length]
  ].map(([label, enabled, total]) => {
    const item = document.createElement('div'); item.className = 'bank-stat';
    const title = document.createElement('small'); title.textContent = label;
    const value = document.createElement('strong'); value.textContent = `${enabled}／${total}`;
    item.append(title, value); return item;
  }));
  const words = bankFilterWords();
  $('bankListCount').textContent = `顯示 ${words.length} 個單字`;
  const fragment = document.createDocumentFragment();
  words.forEach(word => {
    const row = document.createElement('div'); row.className = 'bank-row';
    row.append(makeBankArt(word));
    const copy = document.createElement('div'); copy.className = 'bank-word';
    const english = document.createElement('strong'); english.textContent = word.en;
    const chinese = document.createElement('small'); chinese.textContent = `${word.zh} · ${word.zhuyin.join(' ')}`;
    copy.append(english, chinese); row.append(copy);
    const sound = document.createElement('button'); sound.type = 'button'; sound.className = 'bank-sound'; sound.textContent = '♫'; sound.setAttribute('aria-label', `播放 ${word.en} 發音`); sound.addEventListener('click', () => previewBankAudio(word)); row.append(sound);
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.className = 'bank-toggle'; toggle.checked = !state.disabledIds.has(word.id); toggle.setAttribute('aria-label', `${word.en} ${word.zh} 出題`);
    toggle.addEventListener('change', () => {
      const next = new Set(state.disabledIds);
      if (toggle.checked) next.delete(word.id); else next.add(word.id);
      const issue = bankIssue(next);
      if (issue) { toggle.checked = !toggle.checked; $('bankMessage').textContent = issue; return; }
      state.disabledIds = next; $('bankMessage').textContent = `${word.en} 已${toggle.checked ? '啟用' : '停用'}，下回合生效。`;
      saveBankSelection(); renderBank(); prepareRound();
      $('bankList').querySelector(`.bank-toggle[data-id="${word.id}"]`)?.focus({ preventScroll: true });
    });
    toggle.dataset.id = word.id;
    row.append(toggle); fragment.append(row);
  });
  const scrollTop = $('bankList').scrollTop;
  $('bankList').replaceChildren(fragment);
  $('bankList').scrollTop = scrollTop;
}
function showSettingsPage(name) {
  $('settingsMain').classList.toggle('hidden', name !== 'main');
  $('wordBankPage').classList.toggle('hidden', name !== 'bank');
  $('historyPage').classList.toggle('hidden', name !== 'history');
  $('settingsDialog').classList.toggle('bank-open', name !== 'main');
  if (name === 'bank') { renderBank(); $('backToSettings').focus(); }
  else if (name === 'history') { renderHistory(); $('backFromHistory').focus(); }
  else $('openWordBank').focus();
}
function saveAnswerSettings() {
  try { localStorage.setItem(answerStorageKey, JSON.stringify({ format: state.answerFormat, autoAudio: state.autoAudio })); } catch {}
}
function setAnswerFormat(format) {
  if (!['image', 'english'].includes(format)) return;
  state.answerFormat = format;
  document.querySelectorAll('.answer-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.answer === format)));
  $('autoAudioControl').classList.remove('hidden');
  setKidText($('startTitleLine1'), format === 'english' ? '聽英文，' : '聽單字，');
  setKidText($('startTitleLine2'), format === 'english' ? '找單字！' : '找圖片！');
  setKidText($('startDescription'), format === 'english' ? '看包裹圖片，選英文單字。' : '聽英文，選圖片。');
  saveAnswerSettings();
  prepareRound();
}
function setMode(mode) {
  if (!['all', 'level', 'dinosaur'].includes(mode)) return;
  state.mode = mode;
  document.querySelectorAll('.mode-option').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
  $('levelControl').classList.toggle('hidden', mode !== 'level');
  prepareRound();
}
function setLevel(value) {
  state.level = Math.max(1, Math.min(3, Number(value)));
  $('levelSlider').value = String(state.level);
  setKidText($('levelText'), ['第一級', '第二級', '第三級'][state.level - 1]);
  prepareRound();
}
function validateWords(words) {
  if (!Array.isArray(words) || words.length < 80) throw Error('題庫不足');
  const ids = new Set();
  const english = new Set();
  for (const word of words) {
    if (!word.id || !word.category || !word.en || !word.zh || !word.emoji || ids.has(word.id) || english.has(word.en.toLowerCase())) throw Error('題庫資料不完整或單字重複');
    if (!Array.isArray(word.zhuyin) || word.zhuyin.length !== [...word.zh].length || word.zhuyin.some(reading => !reading)) throw Error(`注音資料不完整：${word.id}`);
    if (![1, 2, 3].includes(word.difficulty)) throw Error(`難度資料錯誤：${word.id}`);
    ids.add(word.id); english.add(word.en.toLowerCase());
  }
  for (const mode of ['all', 'level', 'dinosaur']) {
    const levels = mode === 'level' ? [1, 2, 3] : [1];
    for (const level of levels) {
      const eligible = words.filter(word => mode === 'dinosaur' ? word.category === 'dinosaur'
        : word.category !== 'dinosaur' && (mode !== 'level' || word.difficulty === level));
      if (eligible.length < 10) throw Error(`題庫不足：${mode} ${level}`);
    }
  }
}
async function init() {
  state.characterQueue = loadCharacterQueue();
  advanceCast('start');
  annotateStaticUI();
  try { const saved = JSON.parse(localStorage.getItem(answerStorageKey) || 'null');
    if (typeof saved?.autoAudio === 'boolean') state.autoAudio = saved.autoAudio;
    if (saved?.format === 'english') state.answerFormat = 'english';
  } catch {}
  $('autoAudioToggle').checked = state.autoAudio;
  setAnswerFormat(state.answerFormat);
  $('startButton').disabled = true; document.querySelector('.start-label').textContent = '準備題目中…';
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const words = await response.json(); validateWords(words); state.words = words;
    try {
      const saved = JSON.parse(localStorage.getItem(bankStorageKey) || '[]');
      if (Array.isArray(saved)) {
        const ids = new Set(words.map(word => word.id));
        const disabled = new Set(saved.filter(id => ids.has(id)));
        if (!bankIssue(disabled)) state.disabledIds = disabled;
      }
    } catch { /* Browser storage can be unavailable; the default bank remains usable. */ }
    state.history = loadHistory();
    renderBank();
    prepareRound();
    $('startButton').disabled = false; setKidText(document.querySelector('.start-label'), '開始任務');
    const settingsPage = new URLSearchParams(location.search).get('settings');
    if (settingsPage === 'bank' || settingsPage === 'history') {
      showSettingsPage(settingsPage);
      $('settingsDialog').showModal();
    }
  } catch (error) {
    document.querySelector('.start-label').textContent = '題目載入失敗';
    console.error(error);
  }
}
$('startButton').addEventListener('click', startRound);
$('againButton').addEventListener('click', startRound);
$('audioButton').addEventListener('click', () => playWord());
$('nextButton').addEventListener('click', nextQuestion);
$('homeButton').addEventListener('click', goHome);
$('resultHomeButton').addEventListener('click', goHome);
$('settingsButton').addEventListener('click', () => { showSettingsPage('main'); $('settingsDialog').showModal(); });
$('openWordBank').addEventListener('click', () => showSettingsPage('bank'));
$('backToSettings').addEventListener('click', () => showSettingsPage('main'));
$('openHistory').addEventListener('click', () => showSettingsPage('history'));
$('backFromHistory').addEventListener('click', () => showSettingsPage('main'));
$('clearHistory').addEventListener('click', () => { state.history = []; saveHistory(); renderHistory(); prepareRound(); });
document.querySelectorAll('[data-close-settings]').forEach(button => button.addEventListener('click', () => $('settingsDialog').close()));
$('settingsDialog').addEventListener('close', () => { $('settingsDialog').classList.remove('bank-open'); if (state.phase === 'start') prepareRound(); });
$('bankSearch').addEventListener('input', renderBank);
$('bankFilter').addEventListener('change', renderBank);
$('resetWordBank').addEventListener('click', () => {
  state.disabledIds.clear(); saveBankSelection(); renderBank(); prepareRound(); $('bankMessage').textContent = '所有單字已恢復啟用。';
});
$('minusButton').addEventListener('click', () => setCount(state.count - 1));
$('plusButton').addEventListener('click', () => setCount(state.count + 1));
$('questionCount').addEventListener('input', event => setCount(event.target.value));
document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.querySelectorAll('.answer-option').forEach(button => button.addEventListener('click', () => setAnswerFormat(button.dataset.answer)));
$('autoAudioToggle').addEventListener('change', event => { state.autoAudio = event.target.checked; saveAnswerSettings(); });
$('levelSlider').addEventListener('input', event => setLevel(event.target.value));
window.addEventListener('resize', fitVisibleActors);
init();
