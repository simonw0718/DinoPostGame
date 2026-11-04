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
    // 捲軸模式：目前分類鈕捲到中間（只捲分類列，不動整頁）
    const showTab = i => {
      if (pager.dataset.fit !== 'scroll' || !tabs[i]) return;
      const tr = tabs[i].getBoundingClientRect(), pr = pager.getBoundingClientRect();
      pager.scrollTo({ left: pager.scrollLeft + (tr.left + tr.width / 2) - (pr.left + pr.width / 2), behavior: 'smooth' });
    };
    const edge = () => pager.classList.toggle('at-end', pager.scrollLeft + pager.clientWidth >= pager.scrollWidth - 2);
    pager.addEventListener('scroll', edge, { passive: true });
    const sync = () => {
      const i = at(); showTab(i);
      tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', String(k === i)); });
      tabs[i]?.classList.remove('has-new');
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    nav.addEventListener('scroll', () => { clearTimeout(sync.t); sync.t = setTimeout(sync, 60); }, { passive: true });
    addEventListener('resize', () => { nav.style.scrollBehavior = 'auto'; nav.scrollLeft = at() * nav.clientWidth; nav.style.scrollBehavior = ''; });
    sync();
    // 分類鈕字自動縮放（導演 2026-11-04 回報窄手機字被切）：不靠螢幕寬度推算，實際量每顆鈕放不放得下。
    // 先試圖示＋長字 18→16px，再長字（學英文）18→14px，還放不下就改左右捲軸（導演 11-04：字不可省成「英文」，選捲軸不選 2×2）；鈕寬變了（轉向、改視窗）就重量。
    const fitTabs = () => {
      const fits = () => tabs.every(t => {
        const kids = [...t.children].filter(x => getComputedStyle(x).display !== 'none'); if (!kids.length) return true;
        const rs = kids.map(x => x.getBoundingClientRect()), cs = getComputedStyle(t);
        const used = Math.max(...rs.map(r => r.right)) - Math.min(...rs.map(r => r.left));
        return used <= t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + .5;
      });
      for (const [mode, sizes] of [['icon', [18, 17, 16]], ['long', [18, 17, 16, 15, 14]]]) {
        pager.dataset.fit = mode;
        for (const px of sizes) { pager.style.setProperty('--tab-fs', px + 'px'); if (fits()) return; }
      }
      pager.dataset.fit = 'scroll'; pager.style.setProperty('--tab-fs', '17px'); showTab(at());
    };
    // 遊戲卡標題同樣量寬縮字（導演 2026-11-04：長標題在手機超出卡片）：
    // 先一行、從 CSS 字級每次縮 1px；縮到原本 80%（最少 13px）還放不下，就改兩行（前半／後半各一行）再量一次。
    const fitTitles = () => nav.querySelectorAll('.game-choice-copy strong').forEach(st => {
      st.querySelector(':scope > .title-br')?.remove(); st.classList.remove('two-line'); st.style.fontSize = '';
      const card = st.closest('.game-choice'), cs = getComputedStyle(card);
      const room = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);   // 量卡片內寬（文字欄會被長字撐開，不能量它）
      const base = parseFloat(getComputedStyle(st).fontSize), floor = Math.max(13, base * .8);
      const shrink = min => { let px = base; while (st.scrollWidth > room + .5 && px > min) st.style.fontSize = --px + 'px'; return st.scrollWidth <= room + .5; };
      if (shrink(floor)) return;
      st.style.fontSize = ''; st.classList.add('two-line');
      const words = [...st.children], br = document.createElement('i'); br.className = 'title-br';
      words[Math.ceil(words.length / 2)]?.before(br);
      shrink(10);
    });
    const fitAll = () => { fitTabs(); fitTitles(); edge(); };
    new ResizeObserver(() => requestAnimationFrame(fitAll)).observe(pager);
    document.fonts?.ready.then(fitAll);
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
