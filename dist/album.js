// Stamp album: word stamps (by category) and character cards. Reads progress from DinoProgress.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { RULES } = DinoProgress;
  const setKidText = Dino.kidText({
    '集郵冊': ['ㄐㄧˊ', 'ㄧㄡˊ', 'ㄘㄜˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '單字郵票': ['ㄉㄢ', 'ㄗˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ'],
    '角色郵票': ['ㄐㄧㄠˇ', 'ㄙㄜˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ'],
    '單字': ['ㄉㄢ', 'ㄗˋ'],
    '角色': ['ㄐㄧㄠˇ', 'ㄙㄜˋ'],
    '還差': ['ㄏㄞˊ', 'ㄔㄚ'],
    '張': ['ㄓㄤ'],
    '就有新角色郵票！': ['ㄐㄧㄡˋ', 'ㄧㄡˇ', 'ㄒㄧㄣ', 'ㄐㄧㄠˇ', 'ㄙㄜˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', ''],
    '角色郵票收齊了！': ['ㄐㄧㄠˇ', 'ㄙㄜˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', 'ㄕㄡ', 'ㄑㄧˊ', 'ㄌㄜ˙', ''],
    '動物': ['ㄉㄨㄥˋ', 'ㄨˋ'], '食物': ['ㄕˊ', 'ㄨˋ'], '物品': ['ㄨˋ', 'ㄆㄧㄣˇ'], '自然': ['ㄗˋ', 'ㄖㄢˊ'],
    '恐龍': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ'], '其他': ['ㄑㄧˊ', 'ㄊㄚ'], '全部': ['ㄑㄩㄢˊ', 'ㄅㄨˋ'],
    '聽英文': ['ㄊㄧㄥ', 'ㄧㄥ', 'ㄨㄣˊ'], '聽中文': ['ㄊㄧㄥ', 'ㄓㄨㄥ', 'ㄨㄣˊ']
  });
  const kid = (tag, text, className) => { const el = document.createElement(tag); if (className) el.className = className; setKidText(el, text); return el; };

  const groups = [
    { id: 'animals', label: '動物', cats: ['animals'] },
    { id: 'food', label: '食物', cats: ['food'] },
    { id: 'objects', label: '物品', cats: ['objects'] },
    { id: 'nature', label: '自然', cats: ['nature'] },
    { id: 'dinosaur', label: '恐龍', cats: ['dinosaur'] },
    { id: 'other', label: '其他', cats: ['color', 'number', 'music', 'building', 'job'] }
  ];
  const state = { words: [], tab: 'words', group: 'animals', audio: null };

  function stopAudio() { if (state.audio) { state.audio.pause(); state.audio = null; } }
  function play(src, next) {
    stopAudio();
    const audio = new Audio(src); state.audio = audio;
    if (next) audio.addEventListener('ended', next, { once: true });
    audio.play().catch(() => {});
  }

  function statusOf(word, progress) {
    const w = progress[word.id];
    if (w?.stampedAt) return 'stamped';
    if (w && w.count > 0) return 'progress';
    return 'locked';
  }

  function wiggle(slot) { slot.classList.remove('wiggle'); void slot.offsetWidth; slot.classList.add('wiggle'); }

  function openWord(word) {
    const body = $('stampDialogBody'); body.replaceChildren();
    const frame = DinoStampsUI.wordStamp(word);
    const english = document.createElement('div'); english.className = 'dialog-english'; english.textContent = word.en;
    const zh = document.createElement('div'); zh.className = 'dialog-chinese'; zh.setAttribute('aria-label', word.zh);
    [...word.zh].forEach((char, i) => zh.append(Dino.makeBpmUnit(char, word.zhuyin[i])));
    const sound = document.createElement('button'); sound.type = 'button'; sound.className = 'dialog-sound';
    sound.append('♫ ', kid('span', '聽英文'));
    sound.addEventListener('click', () => play(Dino.audioPath(word)));
    body.append(frame, english, zh, sound);
    if (word.zhAudio) {
      const zhSound = document.createElement('button'); zhSound.type = 'button'; zhSound.className = 'dialog-sound';
      zhSound.append('♫ ', kid('span', '聽中文'));
      zhSound.addEventListener('click', () => play(word.zhAudio));
      body.append(' ', zhSound);
    }
    $('stampDialog').showModal();
    play(Dino.audioPath(word), word.zhAudio ? () => setTimeout(() => $('stampDialog').open && play(word.zhAudio), 250) : null);
  }

  function wordSlot(word, progress) {
    const status = statusOf(word, progress);
    const slot = document.createElement('button'); slot.type = 'button'; slot.className = `album-slot ${status}`;
    if (status === 'locked') {
      // Locked stamps never load their picture: no spoilers, and a light page.
      const frame = document.createElement('span'); frame.className = 'stamp-frame';
      const inner = document.createElement('span'); inner.className = 'stamp-inner';
      const q = document.createElement('span'); q.className = 'slot-q'; q.textContent = '?'; inner.append(q); frame.append(inner);
      const label = document.createElement('span'); label.className = 'slot-label'; label.textContent = '？？？';
      slot.append(frame, label);
      slot.setAttribute('aria-label', '還沒拿到的郵票');
      slot.addEventListener('click', () => wiggle(slot));
      return slot;
    }
    const frame = DinoStampsUI.wordStamp(word);
    frame.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; });
    const label = document.createElement('span'); label.className = 'slot-label'; label.textContent = word.en;
    slot.append(frame, label);
    if (status === 'progress') {
      slot.append(DinoStampsUI.dots({ count: progress[word.id].count }));
      slot.setAttribute('aria-label', `${word.en}，進度 ${progress[word.id].count}／${RULES.stampAt}`);
      slot.addEventListener('click', () => { wiggle(slot); play(Dino.audioPath(word)); });
    } else {
      slot.setAttribute('aria-label', `${word.en} ${word.zh}`);
      slot.addEventListener('click', () => openWord(word));
    }
    return slot;
  }

  function cardSlot(n, card) {
    const slot = document.createElement('button'); slot.type = 'button'; slot.className = `album-slot card-slot ${card ? 'stamped' : 'locked'}`;
    const frame = document.createElement('span'); frame.className = 'stamp-frame';
    const inner = document.createElement('span'); inner.className = 'stamp-inner';
    const label = document.createElement('span'); label.className = 'slot-label';
    if (card) {
      const { actor, name } = DinoStampsUI.cardArt(n);
      inner.append(actor); label.textContent = `${name} No.${n}`;
      slot.setAttribute('aria-label', `${name}，第 ${n} 張角色郵票`);
      slot.addEventListener('click', () => { wiggle(slot); DinoStampsUI.cardReveal({ n }); });
    } else {
      const q = document.createElement('span'); q.className = 'slot-q'; q.textContent = '?'; inner.append(q);
      label.textContent = `No.${n}`;
      slot.setAttribute('aria-label', `第 ${n} 張角色郵票，還沒拿到`);
      slot.addEventListener('click', () => wiggle(slot));
    }
    frame.append(inner); slot.append(frame, label);
    return slot;
  }

  function renderSummary(progress) {
    const stats = DinoProgress.stats();
    const total = state.words.length, cardTotal = Math.floor(total / RULES.cardEvery);
    const wordLine = $('wordSummary'), cardLine = $('cardSummary');
    wordLine.replaceChildren(kid('span', '單字'), ' ', Object.assign(document.createElement('strong'), { textContent: stats.stamps }), `／${total}`);
    cardLine.replaceChildren(kid('span', '角色'), ' ', Object.assign(document.createElement('strong'), { textContent: stats.cards }), `／${cardTotal}`);
    const done = stats.cards >= cardTotal;
    $('nextBar').firstElementChild.style.width = `${done ? 100 : (RULES.cardEvery - stats.toNextCard) / RULES.cardEvery * 100}%`;
    $('nextBar').setAttribute('aria-label', done ? '角色郵票收齊了' : `再 ${stats.toNextCard} 張單字郵票就有新角色郵票`);
    const next = $('nextText'); next.replaceChildren();
    if (done) next.append(kid('span', '角色郵票收齊了！'));
    else next.append(kid('span', '還差'), ` ${stats.toNextCard} `, kid('span', '張'), kid('span', '就有新角色郵票！'));
  }

  function render() {
    const progress = DinoProgress.words();
    renderSummary(progress);
    $('tabWords').setAttribute('aria-selected', String(state.tab === 'words'));
    $('tabCards').setAttribute('aria-selected', String(state.tab === 'cards'));
    $('chips').hidden = state.tab !== 'words';
    const grid = $('grid'); grid.replaceChildren();
    if (state.tab === 'cards') {
      const cardTotal = Math.floor(state.words.length / RULES.cardEvery);
      const cards = DinoProgress.cards();
      for (let n = 1; n <= cardTotal; n++) grid.append(cardSlot(n, cards.find(card => card.n === n)));
      return;
    }
    const chips = $('chips'); chips.replaceChildren();
    for (const group of groups) {
      const words = state.words.filter(word => group.cats.includes(word.category));
      const got = words.filter(word => progress[word.id]?.stampedAt).length;
      const chip = document.createElement('button'); chip.type = 'button'; chip.setAttribute('aria-pressed', String(group.id === state.group));
      const count = document.createElement('span'); count.className = 'chip-count'; count.textContent = `${got}/${words.length}`;
      chip.append(kid('span', group.label), count);
      chip.addEventListener('click', () => { state.group = group.id; render(); window.scrollTo({ top: 0 }); });
      chips.append(chip);
    }
    const group = groups.find(item => item.id === state.group);
    const order = { stamped: 0, progress: 1, locked: 2 };
    const words = state.words.filter(word => group.cats.includes(word.category))
      .map((word, index) => ({ word, index, rank: order[statusOf(word, progress)] }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index);
    // Words with the same status keep data order so a child can find "the same place" next time.
    for (const { word } of words) grid.append(wordSlot(word, progress));
  }

  async function init() {
    setKidText($('albumTitle'), '集郵冊'); setKidText($('homeLabel'), '回首頁');
    $('tabWords').replaceChildren(kid('span', '單字郵票'));
    $('tabCards').replaceChildren(kid('span', '角色郵票'));
    $('tabWords').addEventListener('click', () => { state.tab = 'words'; render(); });
    $('tabCards').addEventListener('click', () => { state.tab = 'cards'; render(); });
    $('stampDialogClose').addEventListener('click', () => $('stampDialog').close());
    $('stampDialog').addEventListener('close', stopAudio);
    try {
      const response = await fetch('data.json');
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      state.words = await response.json();
      await DinoStampsUI.ready;
      const tab = new URLSearchParams(location.search).get('tab');
      if (tab === 'cards') state.tab = 'cards';
      render();
    } catch (error) {
      console.error(error);
      $('loadError').hidden = false;
    }
  }
  init();
})();
