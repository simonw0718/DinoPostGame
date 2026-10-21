// DINO MODE 首頁動畫（導演 2026-10-21 選 A 腳印章＋D 切換轉場並核准）
// A：開場最後郵戳蓋下時，若是 DINO MODE 就「咚」一下（信紙震、噴土）；郵戳圖樣本身由 dino-anim.css 換成腳印章
// D：按 DINO MODE 開關 → 開場信封重播；同時腳印從左踩到右、畫面每步一震，背景淡入河谷；關掉時腳印淡出、背景淡回
(() => {
  const screen = document.querySelector('.game-selector'), letter = document.querySelector('.selector-letter');
  const sw = document.getElementById('dinoModeSwitch');
  if (!screen || !letter || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const postmark = letter.querySelector('.letter-postmark'), world = screen.querySelector('.start-world');
  const thud = 'cubic-bezier(.2,1.6,.4,1)';
  const on = () => document.documentElement.classList.contains('dino-mode');

  const shake = (px = 4) => screen.animate([{ transform: 'none' }, { transform: `translate(${px * .4}px, ${px}px)` }, { transform: `translate(${-px * .3}px, ${-px * .4}px)` }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
  const dust = (box, x, y, n = 5, spread = 26) => {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'); d.className = 'dino-dust'; box.appendChild(d);
      const ang = Math.PI * (1.05 + .9 * i / (n - 1)), r = spread * (.7 + Math.random() * .5);
      Object.assign(d.style, { left: `${x}px`, top: `${y}px` });
      d.animate([{ transform: 'scale(.4)', opacity: .9 }, { transform: `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r * .5}px) scale(1.3)`, opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'both' }).finished.then(() => d.remove());
    }
  };
  // A：開場郵戳在 3.7 秒蓋下（home-intro.js），DINO MODE 時多一個「咚」；點畫面跳過開場就取消
  let thudT;
  const thudLater = () => {
    clearTimeout(thudT); if (!on()) return;
    thudT = setTimeout(() => { letter.animate([{ translate: '0 0' }, { translate: '0 5px' }, { translate: '0 0' }], { duration: 200, easing: 'ease-out' }); shake(3); }, 3930);
  };
  screen.addEventListener('pointerdown', () => clearTimeout(thudT), { capture: true });
  if (screen.dataset.intro !== 'done') thudLater();

  // D：切換轉場
  let trail = null, busy = false;
  const fadeFrom = bg => {
    const f = document.createElement('div'); f.className = 'dino-fade';
    f.style.background = bg; world.after(f);
    return f;
  };
  const stomp = async () => {
    trail?.remove(); trail = document.createElement('div'); trail.className = 'dino-trail'; screen.appendChild(trail);
    const W = screen.clientWidth, top = Math.max(letter.offsetTop, screen.clientHeight * .45);
    const s = Math.round(Math.min(64, Math.max(40, W * .11)));
    const n = W < 500 ? 6 : 8, x0 = W * .06, x1 = W * .94, y0 = top * .82, y1 = top * .4;
    const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI + 90;
    trail.style.setProperty('--s', `${s}px`);
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), side = i % 2 ? 1 : -1;
      const x = x0 + (x1 - x0) * k + side * s * .18, y = y0 + (y1 - y0) * k + side * s * .42;
      const p = document.createElement('span'); p.className = 'dino-step'; trail.appendChild(p);
      Object.assign(p.style, { left: `${x}px`, top: `${y}px`, transform: `rotate(${ang + side * 8}deg)` });
      p.animate([{ scale: '1.7', opacity: 0 }, { scale: '.94', opacity: .85, offset: .7 }, { scale: '1', opacity: .78 }], { duration: 230, easing: thud, fill: 'both' });
      setTimeout(() => { shake(i === n - 1 ? 5 : 3); dust(trail, x, y + s * .3, 4, 20); }, 150);
      await new Promise(r => setTimeout(r, 210));
    }
  };
  const fadeTrail = () => {
    const t = trail; trail = null; if (!t) return;
    [...t.querySelectorAll('.dino-step')].forEach((p, i) => p.animate([{ opacity: .78 }, { opacity: 0 }], { duration: 500, delay: i * 70, fill: 'both' }));
    setTimeout(() => t.remove(), 1200);
  };
  // 在 game-homes.js 切換 class 之前先記下舊背景（document 捕獲階段比按鈕自己的監聽早）
  // 導演 2026-10-21：切換時開場信封自動重播（封蠟／郵戳跟著換），背景淡換＋腳印同時進行
  document.addEventListener('intro:done', () => { busy = false; });
  document.addEventListener('click', e => {
    if (!sw || !e.target.closest('#dinoModeSwitch')) return;
    if (busy) { e.stopPropagation(); return; }   // 開場重播完前不重複切換
    const old = getComputedStyle(world).background, turningOn = !on();
    const f = fadeFrom(old); busy = true;
    setTimeout(async () => {   // 等 game-homes.js 換好 class 再重播
      document.dispatchEvent(new Event('intro:replay')); thudLater();
      const fade = f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500, delay: 200, easing: 'ease-in-out', fill: 'both' });
      if (turningOn) { await stomp(); setTimeout(fadeTrail, 2600); } else fadeTrail();
      await fade.finished; f.remove();
    }, 0);
  }, true);
})();
