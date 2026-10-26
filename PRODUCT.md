# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- 約 4–8 歲孩子，自己在 iPad（直式為主，也支援橫式、手機、電腦）上操作；家長可能在旁邊。
- 兩群家庭（導演 2026-10-26）：導演自家孩子先用，之後也公開給恐龍郵局 Podcast／YouTube 觀眾的家庭。陌生家長第一次打開也要一看就懂。
- 孩子還在學認字：介面文字要有注音，玩法要能不看字、靠聲音與圖理解。

## Product Purpose

恐龍郵局單字小遊戲集：用聽音、圖片、注音練英文單字、注音與國字。成功＝學習與好玩平衡，一局只玩幾分鐘、玩得開心也真的學到，不讓孩子沉迷（導演 2026-10-26）。

## Positioning

遊戲角色就是恐龍郵局故事裡的郵差恐龍（伊奇、飛飛、小恐、派羅、小雞阿暴等），孩子從 Podcast／影片認識的角色在遊戲裡陪他們學字。

## Operating Context

- 靜態網站（`dist/`），Cloudflare Worker Static Assets 託管，推 `main` 即上線；沒有建置步驟。
- 首頁選遊戲；每款遊戲的開始畫面兼選單（選項＋選單 BGM），按開始停 BGM、結束畫面再放。
- 遊戲：找圖片、注音送信、郵差翻翻樂、注音輸送帶、走小路、接信、包裹拼拼樂、單字打地鼠（sample）。

## Capabilities and Constraints

- 題庫唯一來源 `dist/data.json`（365 詞，英文／注音／國字各 1–3 級；DINO MODE 恐龍包另計）；英文音檔 `assets/audio/<id>.mp3`，中文 `assets/audio/zh/`，37 注音、26 字母（念字母名）音檔。
- 共用層 `dist/shared.js`：`Dino.kidText` 注音（唯一注音排版方式，不手寫 `<ruby>`）、`Dino.sfx`／`bgm`／`voice`／`preload`、`selectRound`（答錯的字較常回來）、`howto` 玩法框、`menuTaps`。
- 全站字型內海（Naikai 子集），新增字要重建子集（`tools/build_naikai_font.py`）。
- 左上回首頁鈕統一橘紅房子（`home-button.css`），標題列 `game-header.css`。
- iOS 要在點擊事件內解鎖音訊；音檔慢到不可讓遊戲卡住。
- 「一次答對」寫進 `DinoProgress` 與最近 10 回合紀錄。

## Brand Commitments

- 每款遊戲都要有恐龍郵局的恐龍角色；郵務主題（送信、郵票、信封）不一定要有（導演 2026-10-26）。
- 角色卡使用 `dist/assets/cast/` 現有姿勢圖，不另畫走樣的角色。
- 泡泡／特效不放中文字；需要字時用注音（導演規則）。

## Evidence on Hand

- 角色姿勢圖 `dist/assets/cast/*.webp`、單字圖 `dist/assets/rebuilt/`、背景 `dist/assets/mail-bg/`、音效 `dist/assets/audio/effects/`。
- 決策與規格：`vault/決策/`、`vault/產品規格.md`、`vault/開發紀錄.md`。

## Product Principles

1. 聽得懂就玩得了：不識字的孩子靠聲音與圖也能玩完一局。
2. 錯了不懲罰：沒答對就再來、不扣分、不顯示失敗；錯過的字之後再回來。
3. 短而完整：一局幾分鐘就有結束畫面與成就感，不設無盡模式。
4. 角色陪玩：恐龍角色是回饋與情緒的主體，不是裝飾。
5. 先做短 sample 給導演 iPad 實測，再擴充。

## Accessibility & Inclusion

- 觸控目標要大（孩子手指）；iPad 直式與電腦寬版都要能玩。
- 尊重 `prefers-reduced-motion`。
