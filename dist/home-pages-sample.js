// 首頁分頁 sample（導演 2026-10-27）：在 home-intro.js 之前登記新遊戲預覽；DOM 好了之後把入口分成每頁 6 張的左右捲軸
(() => {
  'use strict';
  Dino.previews['egg-category-sample.html'] = `<div class="pv pv-egg" aria-hidden="true"><i class="nest n1"></i><i class="nest n2"></i><div class="card c1"><img src="assets/rebuilt/emoji-6x8-v1/food-broccoli.png" alt=""></div><div class="card c2"><img src="assets/rebuilt/emoji-6x8-v1/kidapp-sock.png" alt=""></div><i class="egg g1"></i><i class="egg g2"></i><i class="rim n1"></i><i class="rim n2"></i><b class="x">✕</b><i class="tap"></i><span class="seal">OK</span></div>`;
  const PER = 6;
  document.addEventListener('DOMContentLoaded', () => {
    Dino.kidText({ '恐龍蛋快打': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄉㄢˋ', 'ㄎㄨㄞˋ', 'ㄉㄚˇ'] })(document.querySelector('.is-egg strong'), '恐龍蛋快打');
    const nav = document.querySelector('.game-choices');
    const cards = [...nav.querySelectorAll('.game-choice')];
    if (cards.length <= PER) return;
    nav.classList.add('paged');
    const pages = [];
    for (let i = 0; i < cards.length; i += PER) {
      const p = document.createElement('div'); p.className = 'choice-page';
      p.append(...cards.slice(i, i + PER)); nav.append(p); pages.push(p);
    }
    const pager = document.createElement('div'); pager.className = 'pager';
    pager.innerHTML = `<button type="button" class="prev" aria-label="上一頁">‹</button><span class="dots">${pages.map((p, i) => `<i class="${p.querySelector('.new-tag') ? 'has-new' : ''}" data-i="${i}"></i>`).join('')}</span><button type="button" class="next" aria-label="下一頁">›</button>`;
    nav.after(pager);
    const prev = pager.querySelector('.prev'), next = pager.querySelector('.next'), dots = [...pager.querySelectorAll('.dots i')];
    const at = () => Math.round(nav.scrollLeft / nav.clientWidth);
    const go = i => { nav.scrollTo({ left: Math.max(0, Math.min(pages.length - 1, i)) * nav.clientWidth }); Dino.sfx?.('tap', .4); };
    const sync = () => { const i = at(); dots.forEach((d, k) => d.classList.toggle('on', k === i)); prev.disabled = i === 0; next.disabled = i === pages.length - 1; if (i > 0) dots[i].classList.remove('has-new'); };
    prev.addEventListener('click', () => go(at() - 1));
    next.addEventListener('click', () => go(at() + 1));
    dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
    nav.addEventListener('scroll', () => { clearTimeout(sync.t); sync.t = setTimeout(sync, 60); }, { passive: true });
    addEventListener('resize', () => { nav.style.scrollBehavior = 'auto'; nav.scrollLeft = at() * nav.clientWidth; nav.style.scrollBehavior = ''; });
    sync();
    // 進場後偷看下一頁：往右滑出約 1/4 再彈回，箭頭跳三下（每次瀏覽一次；動作減量時只跳箭頭）
    const peek = () => {
      next.classList.add('hint');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || at() !== 0) return;
      setTimeout(() => {
        const w = nav.clientWidth;
        const a = pages[0].animate([{ transform: 'none' }, { transform: `translateX(${-w * .26}px)`, offset: .45 }, { transform: `translateX(${-w * .26}px)`, offset: .6 }, { transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)' });
        pages[1].animate([{ transform: 'none' }, { transform: `translateX(${-w * .26}px)`, offset: .45 }, { transform: `translateX(${-w * .26}px)`, offset: .6 }, { transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)' });
        a.finished.then(() => next.classList.remove('hint'));
      }, 900);
    };
    const screen = document.querySelector('.game-selector');
    if (screen?.dataset.intro === 'done') setTimeout(peek, 600);
    else document.addEventListener('intro:done', () => setTimeout(peek, 600), { once: true });
  });
})();
