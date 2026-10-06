// Stamp UI shared by both games: progress dots on answers, "new stamps" row on results,
// character-card reveal and the album link. Load after shared.js and progress.js.
window.DinoStampsUI = (() => {
  'use strict';
  const { RULES } = DinoProgress;
  const setKidText = Dino.kidText({
    '新郵票': ['ㄒㄧㄣ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ'],
    '集郵冊': ['ㄐㄧˊ', 'ㄧㄡˊ', 'ㄘㄜˋ'],
    '新角色郵票！': ['ㄒㄧㄣ', 'ㄐㄧㄠˇ', 'ㄙㄜˋ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', ''],
    '收下': ['ㄕㄡ', 'ㄒㄧㄚˋ']
  });
  const kid = (tag, text, className) => { const el = document.createElement(tag); if (className) el.className = className; setKidText(el, text); return el; };
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const style = document.createElement('style');
  style.textContent = `
.stamp-dots{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:4px}
.stamp-dots i{width:9px;height:9px;border-radius:50%;background:#e2d6b8;box-shadow:inset 0 1px 0 #0001}
.stamp-dots i.on{background:#f2b945}
.stamp-dots i.new{animation:dotPop .5s cubic-bezier(.2,1.6,.4,1) both}
.choice-back .stamp-dots{position:absolute;left:12px;top:10px;margin:0;gap:3px}
.choice-back .stamp-dots i{width:8px;height:8px}
.stamp-dots.full i{background:#f2b945;box-shadow:0 0 6px #f2b945}
.stamp-dots .dots-moon{margin-left:3px;font-size:12px;color:#8a7a55}
@keyframes dotPop{0%{transform:scale(0)}60%{transform:scale(1.6)}100%{transform:scale(1)}}
.stamp-frame{position:relative;display:grid;place-items:center;border-radius:2px;padding:6px;
  background:radial-gradient(circle at 5px 5px,#0000 2.6px,#fffdf6 3px) -5px -5px/10px 10px;filter:drop-shadow(0 2px 2px #6b4f2a55)}
.stamp-frame>.stamp-inner{width:100%;height:100%;display:grid;place-items:center;overflow:hidden;border:1.5px solid #e6c98f;background:#fffaf0}
.stamp-frame img,.stamp-frame .stamp-art{width:88%;height:88%;object-fit:contain}
.stamp-frame img.card-pic{width:100%;height:100%;object-fit:cover}
.stamp-frame .stamp-sheet{background-size:500% 200%;background-repeat:no-repeat}
.stamp-frame .stamp-emoji{font-size:var(--emoji,26px);line-height:1}
.stamp-summary{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;margin:10px auto 4px}
.stamp-summary[hidden]{display:none}
.stamp-summary .summary-title{display:flex;align-items:center;gap:6px;color:#b4572f;font-weight:1000;font-size:18px}
.stamp-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.stamp-row .stamp-frame{width:58px;height:58px;--emoji:28px;animation:stampIn .5s cubic-bezier(.2,1.5,.4,1) both}
@keyframes stampIn{from{opacity:0;transform:translateY(-14px) rotate(-12deg) scale(.6)}}
.album-link{display:inline-flex;align-items:center;gap:4px;min-height:46px;padding:5px 10px;border:2px solid #e6c98f;border-radius:14px;background:#fffaf0;color:#7a5a2c;font-weight:900;text-decoration:none;font-size:16px}
.album-link .album-icon{font-size:19px}
.album-link .album-count{min-width:24px;padding:1px 6px;border-radius:99px;background:#f2b945;color:#4a3412;font-size:13px;text-align:center}
.album-link.bump{animation:albumBump .45s cubic-bezier(.2,1.6,.4,1)}
@keyframes albumBump{50%{transform:scale(1.18) rotate(-4deg)}}
.card-reveal{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:#103c2dcc;padding:16px}
.card-reveal .card-box{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 20px;border:5px solid #fff4d9;border-radius:24px;background:#fffdf4;max-width:340px;width:100%;animation:cardIn .7s cubic-bezier(.2,1.4,.4,1) both}
.card-reveal .card-title{color:#c4572f;font-size:24px;font-weight:1000}
.card-reveal .stamp-frame{width:200px;height:240px;padding:9px}
.card-reveal .card-actor{width:92%;height:92%;background-repeat:no-repeat}
.card-reveal .card-name{font-size:22px;font-weight:1000;color:#1f6245}
.card-reveal .card-no{font-size:13px;color:#8a7a55;font-weight:800}
.card-reveal button{min-height:52px;min-width:160px;border:0;border-radius:16px;background:linear-gradient(#ffca58,#f6ac34);color:#573e1d;font-size:20px;font-weight:1000;box-shadow:0 5px 0 #b9792b}
@keyframes cardIn{from{opacity:0;transform:scale(.4) rotate(-10deg)}}
@media(prefers-reduced-motion:reduce){.stamp-dots i.new,.stamp-row .stamp-frame,.album-link.bump,.card-reveal .card-box{animation:none}}`;
  document.head.append(style);

  // Picture of a word inside a stamp (same art sources as the game cards).
  function wordStamp(word) {
    const frame = document.createElement('span'); frame.className = 'stamp-frame';
    const inner = document.createElement('span'); inner.className = 'stamp-inner';
    let art;
    if (word.image && word.category !== 'number') { art = document.createElement('img'); art.src = word.image; art.alt = ''; art.className = 'stamp-art'; }
    else if (word.sheet && Number.isInteger(word.cell)) {
      art = document.createElement('span'); art.className = 'stamp-art stamp-sheet';
      art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.jpg')`;
      art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
    } else { art = document.createElement('span'); art.className = 'stamp-emoji'; art.textContent = word.emoji; }
    inner.append(art); frame.append(inner);
    frame.setAttribute('aria-label', `${word.en} 郵票`);
    return frame;
  }

  // Character stamp pictures: dist/assets/cards/manifest.json (built by tools/make_character_cards.py).
  // Falls back to the game's pose sheets if the manifest is missing.
  let cardItems = null;
  const ready = fetch('assets/cards/manifest.json').then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(m => { cardItems = m.items; }).catch(() => { cardItems = null; });
  const poseCatalog = Dino.characters.flatMap(c => Array.from({ length: c.frames }, (_, frame) => ({ character: c, frame })));
  function cardArt(n) {
    if (cardItems?.length) {
      const item = cardItems[(n - 1) % cardItems.length];
      const picture = document.createElement('img'); picture.className = 'card-pic'; picture.alt = '';
      picture.src = item.image; picture.loading = 'lazy';
      return { actor: picture, name: item.name, pose: item.pose };
    }
    const { character, frame } = poseCatalog[(n - 1) % poseCatalog.length];
    const actor = document.createElement('span'); actor.className = 'card-actor';
    actor.style.backgroundImage = `url('assets/${character.asset}')`;
    actor.style.backgroundSize = `${character.frames * 100}% 100%`;
    actor.style.backgroundPosition = character.frames > 1 ? `${frame / (character.frames - 1) * 100}% 0` : '0 0';
    return { actor, name: character.name };
  }

  // ●●●○○ under an answer. `result` is what DinoProgress.record returned.
  function dots(result) {
    const box = document.createElement('span'); box.className = 'stamp-dots';
    if (!result) return box;
    const count = Math.min(result.count, RULES.stampAt);
    for (let i = 0; i < RULES.stampAt; i++) {
      const dot = document.createElement('i');
      if (i < count) dot.className = 'on';
      if (result.counted && i === count - 1) dot.classList.add('new');
      box.append(dot);
    }
    // Text messages go to the page's feedback line (see message()); the card only gets small marks.
    if (result.stamped) box.classList.add('full');
    else if (result.capped) { const moon = document.createElement('span'); moon.className = 'dots-moon'; moon.setAttribute('aria-hidden', 'true'); moon.textContent = '☾'; box.append(moon); }
    box.setAttribute('aria-label', result.stamped ? '拿到郵票了' : `郵票進度 ${count}／${RULES.stampAt}`);
    return box;
  }

  // Feedback-line text for a recorded answer, or '' to keep the page's own message.
  const message = result => result?.stamped ? '拿到郵票了！' : '';

  function albumLink() {
    const link = document.createElement('a'); link.className = 'album-link'; link.href = 'album.html';
    const icon = document.createElement('span'); icon.className = 'album-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = '📒';
    const count = document.createElement('span'); count.className = 'album-count';
    link.append(icon, kid('span', '集郵冊'), count);
    const refresh = () => { count.textContent = String(DinoProgress.stats().stamps); };
    refresh();
    link.refresh = refresh;
    return link;
  }

  function flyInto(from, to) {
    if (reduced() || !from || !to) return Promise.resolve();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const ghost = from.cloneNode(true);
    Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: 0, zIndex: 70, pointerEvents: 'none', animation: 'none' });
    document.body.append(ghost);
    return ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.25)`, opacity: .2 }
    ], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.finally(() => ghost.remove());
  }

  function cardReveal(card) {
    return ready.then(() => new Promise(resolve => {
      const overlay = document.createElement('div'); overlay.className = 'card-reveal';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      const box = document.createElement('div'); box.className = 'card-box';
      const frame = document.createElement('span'); frame.className = 'stamp-frame';
      const inner = document.createElement('span'); inner.className = 'stamp-inner';
      const { actor, name } = cardArt(card.n);
      inner.append(actor); frame.append(inner);
      const title = kid('strong', '新角色郵票！', 'card-title');
      const label = document.createElement('span'); label.className = 'card-name'; label.textContent = name;
      const no = document.createElement('span'); no.className = 'card-no'; no.textContent = `No. ${card.n}`;
      const close = document.createElement('button'); close.type = 'button'; close.append(kid('span', '收下'));
      close.addEventListener('click', () => { overlay.remove(); resolve(); });
      box.append(title, frame, label, no, close); overlay.append(box);
      document.body.append(overlay);
      Dino.burst(frame);
      close.focus();
    }));
  }

  // Fill a result-screen container with the round's new stamps, fly them into the album link,
  // then reveal any character cards earned this round.
  async function showRoundStamps(container, results, words, link) {
    const byId = new Map(words.map(word => [word.id, word]));
    const stamped = results.filter(r => r?.stamped).map(r => byId.get(r.id)).filter(Boolean);
    const cards = results.filter(r => r?.card).map(r => r.card);
    container.replaceChildren();
    container.hidden = !stamped.length;
    if (link) link.refresh?.();
    if (!stamped.length) return;
    const title = document.createElement('div'); title.className = 'summary-title';
    const plus = document.createElement('span'); plus.textContent = `+${stamped.length}`;
    title.append(kid('span', '新郵票'), plus);
    const row = document.createElement('div'); row.className = 'stamp-row';
    stamped.forEach((word, i) => { const s = wordStamp(word); s.style.animationDelay = `${i * 120}ms`; row.append(s); });
    container.append(title, row);
    await new Promise(r => setTimeout(r, reduced() ? 50 : 900 + stamped.length * 120));
    if (link) {
      await Promise.all([...row.children].map((s, i) => new Promise(r => setTimeout(r, i * 90)).then(() => flyInto(s, link))));
      link.refresh?.(); link.classList.remove('bump'); void link.offsetWidth; link.classList.add('bump');
    }
    for (const card of cards) await cardReveal(card);
  }

  return { ready, dots, message, albumLink, wordStamp, cardArt, cardReveal, showRoundStamps };
})();
