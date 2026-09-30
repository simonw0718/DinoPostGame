# 恐龍郵局・英文單字任務

給約 4–8 歲孩子自行操作的聽音選圖遊戲。每題聽美式英文發音，從四張圖片中選答案；答對後四張卡翻面顯示繁體中文與逐字注音。介面以手機為優先，也支援平板與桌面。

## 目前功能

- 262 個詞：一般詞 227 個，分三級；恐龍與史前夥伴 35 個，獨立成「恐龍挑戰」。
- 每回合預設 5 題，可在設定中改為 3–10 題；顯示第一次就答對的題數。
- 題目進入時播放單字錄音，可按「再聽」重播；答錯、答對、完成各有短音效。
- 選項答對後直接翻面。中文字與右側直排注音固定成對，包含聲調和輕聲點。
- 兩種結算畫面輪替；題目及結算畫面皆可回首頁。

## 本機預覽

這是沒有建置步驟的靜態網站。於倉庫根目錄執行：

```sh
python3 -m http.server 4173 -d dist
```

瀏覽 `http://localhost:4173/`。直接以 `file://` 開啟時，瀏覽器可能無法讀取題庫 JSON。

## Cloudflare Pages

使用 GitHub 倉庫連接 Cloudflare Pages：

| 設定 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | 留空，或填 `exit 0` |
| Build output directory | `dist` |
| Root directory | 倉庫根目錄 |

推送到 `main` 後，Cloudflare Pages 的 Git 整合可自動部署新版本。尚未連接 Cloudflare 帳號時，此設定只代表已備妥可部署的倉庫，不代表網站已上線。

## 題庫維護

`dist/data.json` 是唯一正式題庫。每筆使用穩定 `id`、英文 `en`、中文 `zh`、對應每個國字的 `zhuyin`、`difficulty`、`category` 及圖像欄位。音檔放在 `dist/assets/audio/<id>.mp3`。新增或修改後執行：

```sh
node tools/validate-data.mjs
```

介面與三組候選插畫為本專案衍生素材；部分詞彙、錄音與候選圖片整理自專案作者的 [kidsapp](https://github.com/simonw0718/kidsapp)。三角龍原候選圖帶浮水印，發布版改用本專案 SVG。此倉庫未宣告開源授權；使用素材前請另行確認權利。

本機 Obsidian vault 留在工作專案內，不包含在公開倉庫中。
