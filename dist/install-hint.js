/* 首頁角落「放到主畫面」按鈕（導演 2026-11-23）。
   Android／Chrome：按一下直接跳系統安裝視窗（beforeinstallprompt）。
   iPad／iPhone：蘋果不開放程式直接安裝，改跳 3 步圖解，箭頭指向分享鈕。
   已從主畫面開啟的就不顯示。只掛在首頁（index.html）。 */
(() => {
  const force = new URLSearchParams(location.search).get('installhint');   // 測試用：?installhint=ipad／iphone／android 強制顯示
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (standalone && !force) return;
  const ua = navigator.userAgent, iOS = force ? /^(ipad|iphone)$/.test(force) : /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const phone = force ? force === 'iphone' : iOS && /iPhone|iPod/.test(ua);
  let deferred = null, btn = null;
  const css = document.createElement('style');
  css.textContent = `.dino-install{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:40;display:flex;align-items:center;gap:6px;height:44px;padding:0 14px 0 10px;border:3px solid #fffdf2;border-radius:22px;background:#1f6b4b;color:#fff;font:900 15px/1 system-ui,"Noto Sans TC",sans-serif;box-shadow:0 4px 0 #0f3b2a;cursor:pointer}
.dino-install svg{width:22px;height:22px;flex:none}.dino-install[hidden]{display:none}
.di-sheet{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:20px;background:#0b2a1ecc}.di-sheet[hidden]{display:none}
.di-card{position:relative;width:min(420px,100%);padding:22px 20px 18px;border:5px solid #fffdf2;border-radius:26px;background:#fff8df;color:#234d3b;box-shadow:0 8px 0 #0f3b2a;font:700 17px/1.5 system-ui,"Noto Sans TC",sans-serif}
.di-card h2{margin:0 0 10px;font-size:22px;font-weight:1000}.di-card ol{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.di-card li{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:16px;background:#fff;border:2px solid #e4dcb8}
.di-card li b{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#1f6b4b;color:#fff;font-size:16px}
.di-card li svg{width:26px;height:26px;flex:none;vertical-align:middle}.di-card small{display:block;margin-top:10px;color:#6a7a5e;font-size:13px;font-weight:600}
.di-close{display:block;width:100%;margin-top:14px;min-height:50px;border:0;border-radius:16px;background:#1f6b4b;color:#fff;font:1000 18px system-ui,"Noto Sans TC",sans-serif;box-shadow:0 4px 0 #0f3b2a;cursor:pointer}
.di-arrow{position:fixed;z-index:91;width:56px;height:56px;pointer-events:none;color:#ffd84a;filter:drop-shadow(0 2px 0 #0b2a1e);animation:di-bob 1s ease-in-out infinite}
@keyframes di-bob{50%{translate:0 -8px}}@media (prefers-reduced-motion:reduce){.di-arrow{animation:none}}`;
  document.head.append(css);
  const shareSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const plusSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>';
  const arrowSvg = up => `<svg viewBox="0 0 56 56" fill="currentColor"><path d="${up ? 'M28 4 8 28h13v24h14V28h13z' : 'M28 52 8 28h13V4h14v24h13z'}"/></svg>`;
  const sheet = document.createElement('div'); sheet.className = 'di-sheet'; sheet.hidden = true;
  let arrow = null;
  const close = () => { sheet.hidden = true; arrow?.remove(); arrow = null; };
  const open = () => {
    const steps = iOS
      ? [`點瀏覽器的「分享」鈕 ${shareSvg}（${phone ? '畫面最下面' : '畫面右上角'}）`, `往下滑，找到「加入主畫面」 ${plusSvg}`, '按右上角「新增」，桌面就多一個恐龍郵局']
      : ['點瀏覽器右上角的選單（⋮）', '選「安裝應用程式」或「加到主畫面」', '按「安裝」，桌面就多一個恐龍郵局'];
    sheet.innerHTML = `<div class="di-card" role="dialog" aria-modal="true" aria-label="放到主畫面"><h2>放到主畫面，一點就玩</h2><ol>${steps.map((t, i) => `<li><b>${i + 1}</b><span>${t}</span></li>`).join('')}</ol>${iOS ? '<small>要用 Safari 瀏覽器開啟才找得到「加入主畫面」。</small>' : ''}<button type="button" class="di-close">知道了</button></div>`;
    sheet.hidden = false;
    sheet.querySelector('.di-close').addEventListener('click', close);
    if (iOS) {
      arrow = document.createElement('div'); arrow.className = 'di-arrow'; arrow.innerHTML = arrowSvg(!phone);
      if (phone) { arrow.style.cssText = 'left:50%;margin-left:-28px;bottom:6px'; } else { arrow.style.cssText = 'right:14px;top:4px'; }
      document.body.append(arrow);
    }
  };
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });
  addEventListener('appinstalled', () => { btn?.remove(); close(); });
  function show() {
    if (btn) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dino-install'; btn.setAttribute('aria-label', '放到主畫面');
    btn.innerHTML = `${plusSvg}<span>放到主畫面</span>`;
    btn.addEventListener('click', async () => {
      if (deferred) { try { deferred.prompt(); await deferred.userChoice; } catch { /* ok */ } deferred = null; btn?.remove(); btn = null; }
      else open();
    });
    document.body.append(btn, sheet);
  }
  const ready = () => { if (force || iOS || navigator.maxTouchPoints > 0) show(); };
  if (document.body) ready(); else addEventListener('DOMContentLoaded', ready);
})();
