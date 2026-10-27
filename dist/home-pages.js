// 首頁分區（導演 2026-10-27）：入口依 data-group 分成「學英文／玩注音／練腦力」三頁左右捲軸，每頁 2×2；分區鈕在 index.html（.pager .tab，注音由 game-homes.js 標）；進場偷看下一頁；樣式在 home.css
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.game-choices');
    const pager = document.querySelector('.pager');
    if (!nav || !pager) return;
    const tabs = [...pager.querySelectorAll('.tab')];
    nav.classList.add('paged');
    const pages = tabs.map(tab => {
      const p = document.createElement('div'); p.className = 'choice-page'; p.setAttribute('role', 'tabpanel');
      p.append(...nav.querySelectorAll(`.game-choice[data-group="${tab.dataset.group}"]`));
      if (p.querySelector('.new-tag')) tab.classList.add('has-new');
      nav.append(p); return p;
    });
    const at = () => Math.round(nav.scrollLeft / nav.clientWidth);
    const go = i => { nav.scrollTo({ left: Math.max(0, Math.min(pages.length - 1, i)) * nav.clientWidth }); Dino.sfx?.('tap', .4); };
    const sync = () => {
      const i = at();
      tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', String(k === i)); });
      tabs[i]?.classList.remove('has-new');
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    nav.addEventListener('scroll', () => { clearTimeout(sync.t); sync.t = setTimeout(sync, 60); }, { passive: true });
    addEventListener('resize', () => { nav.style.scrollBehavior = 'auto'; nav.scrollLeft = at() * nav.clientWidth; nav.style.scrollBehavior = ''; });
    sync();
    // 進場後偷看下一頁：往右滑出約 1/4 再彈回，下一個分區鈕跳三下（每次瀏覽一次；動作減量時只跳鈕）
    const peek = () => {
      const hint = tabs[1]; hint?.classList.add('hint');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || at() !== 0 || pages.length < 2) return;
      setTimeout(() => {
        const dx = -nav.clientWidth * .26;
        const frames = [{ transform: 'none' }, { transform: `translateX(${dx}px)`, offset: .45 }, { transform: `translateX(${dx}px)`, offset: .6 }, { transform: 'none' }];
        const a = pages[0].animate(frames, { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)' });
        pages[1].animate(frames, { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)' });
        a.finished.then(() => hint.classList.remove('hint'));
      }, 900);
    };
    const screen = document.querySelector('.game-selector');
    if (screen?.dataset.intro === 'done') setTimeout(peek, 600);
    else document.addEventListener('intro:done', () => setTimeout(peek, 600), { once: true });
  });
})();
