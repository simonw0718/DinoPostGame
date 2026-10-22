// 首頁開場：信封從左上角飄到中央停住 → 打開 → 信紙滑出；結束時發 intro:done 讓角色上台。點畫面可跳過；同一次瀏覽只播一次
(() => {
  const previews = Dino.previews;   // 預覽 markup 在 shared.js，各遊戲 ? 玩法框共用
  document.querySelectorAll('.game-choice').forEach(a => {
    const html = previews[a.getAttribute('href')];
    if (!html) return;
    a.classList.add('has-preview');
    a.insertAdjacentHTML('afterbegin', html);
  });


  const screen = document.querySelector('.game-selector');
  const letter = document.querySelector('.selector-letter');
  const choices = [...document.querySelectorAll('.game-choice')];
  const stickers = [...document.querySelectorAll('.start-sticker,.start-feifei,.start-abao')];
  const done = () => { if (screen?.dataset.intro === 'done') return; if (screen) screen.dataset.intro = 'done'; document.dispatchEvent(new Event('intro:done')); };
  let seen = false; try { seen = sessionStorage.getItem('dino-intro') === '1'; sessionStorage.setItem('dino-intro', '1'); } catch {}
  if (!screen || !letter || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  // 切換 DINO MODE 時重播（dino-anim.js 發 intro:replay）
  let stop = null;
  document.addEventListener('intro:replay', () => { stop?.(); screen.dataset.intro = 'replay'; play(); });
  if (seen) { done(); return; }
  play();

  function play() {

  const ease = { out: 'cubic-bezier(.16,1,.3,1)', back: 'cubic-bezier(.34,1.56,.64,1)', in: 'cubic-bezier(.5,0,.75,0)', drift: 'cubic-bezier(.45,.05,.35,1)' };
  const veil = document.createElement('div'); veil.className = 'intro-veil'; screen.appendChild(veil);
  const all = [];
  const anim = (el, frames, opts) => { const a = el.animate(frames, { fill: 'both', ...opts }); all.push(a); return a; };

  const env = document.createElement('div'); env.className = 'intro-envelope';
  env.innerHTML = '<div class="body"></div><div class="flap"></div><div class="wax"><img src="assets/dinopost-workmark-master.jpg" alt=""></div>';
  veil.appendChild(env);
  const r = screen.getBoundingClientRect();
  const fromX = -r.width / 2 - 60, fromY = -r.height / 2 + 40;   // 左上角外
  // 1) 0–1.8s 飄：左右輕晃、慢慢轉正、由小變大
  anim(env, [
    { transform: `translate(${fromX}px, ${fromY}px) rotate(-24deg) scale(.55)`, opacity: 0 },
    { transform: `translate(${fromX * .62}px, ${fromY * .45}px) rotate(10deg) scale(.7)`, opacity: 1, offset: .3 },
    { transform: `translate(${fromX * .25}px, ${fromY * .3}px) rotate(-7deg) scale(.86)`, offset: .62 },
    { transform: 'translate(0, -8px) rotate(3deg) scale(1)', offset: .88 },
    { transform: 'none' },
  ], { duration: 1800, easing: ease.drift });
  // 2) 1.8–2.3s 停住：落定小彈一下
  anim(env, [{ transform: 'scale(1)' }, { transform: 'scale(1.04,.96)' }, { transform: 'scale(1)' }], { delay: 1800, duration: 320, easing: ease.out, composite: 'add' });
  // 3) 2.3s 封蠟彈開、2.5s 封口翻開
  anim(env.querySelector('.wax'), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-30px) scale(1.4) rotate(40deg)', opacity: 0 }], { delay: 2300, duration: 350, easing: ease.out });
  anim(env.querySelector('.flap'), [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(180deg)' }], { delay: 2480, duration: 480, easing: ease.out });
  // 4) 3.0s 信封退下、信紙滑出
  anim(env, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(90px) scale(.9)' }], { delay: 3050, duration: 420, easing: ease.in, composite: 'add' });
  anim(letter, [
    { opacity: 0, transform: 'translateY(60px) scale(.45)' },
    { opacity: 1, transform: 'translateY(-10px) scale(1.03) rotate(-1deg)', offset: .65 },
    { opacity: 1, transform: 'translateY(0) rotate(1deg)' },
  ], { delay: 2900, duration: 650, easing: ease.out });
  stickers.forEach(s => anim(s, [{ opacity: 0 }, { opacity: 0 }], { duration: 3400 }));
  choices.forEach(c => anim(c, [{ opacity: 0 }, { opacity: 0 }], { duration: 3400 }));
  choices.forEach((c, i) => anim(c, [{ opacity: 0, transform: 'translateY(18px) scale(.92)' }, { opacity: 1, transform: 'none' }], { delay: 3400 + i * 120, duration: 420, easing: ease.back }));
  stickers.forEach((s, i) => anim(s, [{ opacity: 0, transform: 'scale(.6) rotate(-12deg)' }, { opacity: 1, transform: 'none' }], { delay: 3500 + i * 90, duration: 380, easing: ease.back, composite: 'add' }));
  anim(document.querySelector('.letter-postmark'), [{ opacity: 0, transform: 'scale(2.4) rotate(-30deg)' }, { opacity: 1, transform: 'rotate(17deg)' }], { delay: 3700, duration: 300, easing: ease.back });
  // 點畫面任何地方就跳過（大人不必每次等）
  let end;
  const skip = () => { clearTimeout(end); all.forEach(a => a.finish()); veil.remove(); stop = null; done(); };
  end = setTimeout(() => { veil.remove(); stop = null; done(); screen.removeEventListener('pointerdown', skip, true); }, 4000);
  screen.addEventListener('pointerdown', skip, { once: true, capture: true });
  stop = () => { screen.removeEventListener('pointerdown', skip, true); skip(); };
  }
})();
