// Word progress, stamps and character cards (rules: vault/決策/U5U6 集郵冊與學習紀錄規劃.md).
// Shared by app.js and zhuyin-sort.js; load after shared.js. `now` is injectable for tests.
window.DinoProgress = (() => {
  'use strict';
  const KEY = 'dinopost-word-progress-v1';
  const RULES = {
    stampAt: 5,          // first-try correct answers needed for a word stamp
    perDay: 2,           // counted answers per word per day
    cardEvery: 10,       // word stamps per character card
    newPerFive: 3,       // new words per 5-question round
    openLimit: 25,       // in-progress words before new words slow down
    reviewStampedDays: 14
  };
  const DAY = 86400000;
  let state = null;
  let clock = () => Date.now();

  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const blank = () => ({ version: 1, words: {}, cards: [] });
  const entry = id => (state.words[id] ||= { count: 0, seen: 0 });

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Progress stays in memory for this visit. */ }
  }
  // First run: carry over first-try answers from the last-10-rounds history (capped below a stamp).
  function migrate() {
    const fresh = blank();
    const history = window.Dino ? Dino.loadHistory() : [];
    [...history].reverse().forEach(record => record.ids.forEach((id, i) => {
      const w = fresh.words[id] ||= { count: 0, seen: 0 };
      w.seen++;
      w.lastSeen = Date.parse(record.date);
      if (record.results[i] === true) { w.count = Math.min(RULES.stampAt - 1, w.count + 1); w.review = false; }
      else if (record.results[i] === false) { w.review = true; w.wrongAt = w.lastSeen; }
    }));
    return fresh;
  }
  function load() {
    if (state) return state;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved?.version === 1 && saved.words && Array.isArray(saved.cards)) state = saved;
    } catch { /* Fall through to migration. */ }
    if (!state) { state = migrate(); save(); }
    return state;
  }

  const stampCount = () => Object.values(load().words).filter(w => w.stampedAt).length;
  const countedToday = (w, today) => (w.day === today ? w.dayCount || 0 : 0);

  // Record one finished question. firstTry=false means the child missed it before answering correctly.
  function record(id, firstTry) {
    load();
    const now = clock(), today = dayKey(now), w = entry(id);
    w.seen++; w.lastSeen = now;
    const result = { id, counted: false, capped: false, stamped: false, card: null };
    if (!firstTry) { w.review = true; w.wrongAt = now; save(); return { ...result, count: w.count }; }
    w.review = false;
    if (w.stampedAt) { save(); return { ...result, count: w.count, alreadyStamped: true }; }
    if (countedToday(w, today) >= RULES.perDay) { save(); return { ...result, count: w.count, capped: true }; }
    w.day = today; w.dayCount = countedToday(w, today) + 1; w.count++;
    result.counted = true;
    if (w.count >= RULES.stampAt) {
      w.stampedAt = now; result.stamped = true;
      const stamps = stampCount();
      if (stamps % RULES.cardEvery === 0) {
        result.card = { n: state.cards.length + 1, at: now };
        state.cards.push(result.card);
      }
    }
    save();
    return { ...result, count: w.count };
  }

  // Pick a round from the already-filtered pool (mode, level, disabled words).
  function selectRound(pool, count) {
    load();
    const now = clock(), today = dayKey(now), shuffle = Dino.shuffle;
    const info = word => state.words[word.id] || { count: 0, seen: 0 };
    const open = Object.values(state.words).filter(w => w.count > 0 && !w.stampedAt).length;
    const newCap = Math.max(1, Math.round(count * RULES.newPerFive / 5));
    const reservedNew = open < 10 ? newCap : open < RULES.openLimit ? 1 : 0;
    const groups = { review: [], progress: [], fresh: [], stampedDue: [], capped: [], rest: [] };
    for (const word of pool) {
      const w = info(word);
      if (!w.stampedAt && countedToday(w, today) >= RULES.perDay) groups.capped.push(word);
      else if (w.review) groups.review.push(word);
      else if (w.stampedAt) (now - (w.lastSeen || 0) >= RULES.reviewStampedDays * DAY ? groups.stampedDue : groups.rest).push(word);
      else if (w.count > 0 || w.seen > 0) groups.progress.push(word);
      else groups.fresh.push(word);
    }
    groups.review.sort((a, b) => (info(a).wrongAt || 0) - (info(b).wrongAt || 0));
    groups.progress = shuffle(groups.progress).sort((a, b) => info(b).count - info(a).count || (info(a).lastSeen || 0) - (info(b).lastSeen || 0));
    const fresh = shuffle(groups.fresh);
    const picked = [];
    const take = (list, limit = Infinity) => {
      for (const word of list) {
        if (picked.length >= count || limit <= 0) break;
        if (!picked.includes(word)) { picked.push(word); limit--; }
      }
    };
    take(fresh, Math.min(reservedNew, count));
    take(groups.review);
    take(groups.progress);
    take(fresh, newCap - picked.filter(word => !info(word).seen).length);
    take(shuffle(groups.stampedDue), 1);
    take(shuffle(groups.capped));
    take(shuffle(groups.rest));
    take(fresh);
    return shuffle(picked);
  }

  function wordProgress(id) {
    load();
    const w = state.words[id] || { count: 0 };
    return { count: Math.min(w.count, RULES.stampAt), stamped: Boolean(w.stampedAt), cappedToday: countedToday(w, dayKey(clock())) >= RULES.perDay };
  }
  function stats() {
    load();
    const stamps = stampCount();
    return { stamps, cards: state.cards.length, toNextCard: RULES.cardEvery - (stamps % RULES.cardEvery) };
  }
  function reset() { state = blank(); save(); }

  return {
    RULES, record, selectRound, wordProgress, stats, reset,
    cards: () => load().cards.slice(),
    words: () => ({ ...load().words }),
    // Test hooks: fake the clock and reload from storage.
    _setClock(fn) { clock = fn || (() => Date.now()); },
    _reload() { state = null; return load(); }
  };
})();
