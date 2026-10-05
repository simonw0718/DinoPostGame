// Mobile flow smoke test for match.html. Needs Node + playwright: node tools/check_flow.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const root=path.join(__dirname,'..','dist');
 await page.route('http://dino.local/**', async route=>{
  const url=new URL(route.request().url());
  const rel=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const file=path.join(root,rel);
  if(!file.startsWith(root)||!fs.existsSync(file)) return route.fulfill({status:404});
  const ext=path.extname(file); const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream';
  await route.fulfill({status:200,contentType:type,body:fs.readFileSync(file)});
 });
 await page.goto('http://dino.local/match.html');
 await page.getByRole('button',{name:/開始玩/}).waitFor();
 await page.screenshot({path:'/tmp/dino-word-cards/start-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'設定題數'}).click();
 await page.getByRole('button',{name:'增加一題'}).click();
 if(await page.locator('#countOutput').innerText()!=='6') throw Error('settings failed');
 await page.getByRole('button',{name:'完成'}).click();
 await page.getByRole('button',{name:/開始玩/}).click();
 await page.locator('.choice').first().waitFor();
 if(await page.locator('.choice').count()!==4) throw Error('choice count failed');
 const word=await page.locator('#englishWord').innerText();
 const data=JSON.parse(fs.readFileSync(path.join(root,'data.json')));
 const entry=data.find(w=>w.en===word);
 await page.locator(`.choice[data-word-id="${entry.id}"]`).click();
 await page.getByRole('button',{name:'點一下翻面看中文'}).waitFor();
 await page.getByRole('button',{name:'點一下翻面看中文'}).click();
 if(await page.locator('#answerChinese').innerText()!==entry.zh) throw Error('flip failed');
 await page.screenshot({path:'/tmp/dino-word-cards/answer-mobile.png',fullPage:true});
 console.log('PASS mobile flow: settings, 4 choices, answer, flip');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
