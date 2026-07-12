# にほんご冒険（nihongo-quest）— 日語養成戰鬥遊戲

把 [alen60335/nihongo](https://github.com/alen60335/nihongo)（日文旅遊學習帳）的學習資料
改造成「養成 × 戰鬥」遊戲。純前端 HTML5，開 `index.html` 即玩，進度存 localStorage。

## 玩法

- **養成**：狐狸夥伴「コン」。答題得 XP 升級，Lv10 / Lv25 兩次進化（子狐 → 妖狐 → 九尾）。
  戰鬥掉落食物（🍙🐙🍜🍡），餵食回血＋好感度；好感度最高加 30% 攻擊。
- **戰鬥**：回合制答題。答對＝コン攻擊（4 秒內快答 ×1.4、連擊最高 ×2、必殺技 ×2.4）；
  答錯或 15 秒超時＝被反擊，並看到正解與解說。連續答對累積必殺計量表。
- **地圖**：原資料的 4 週＝4 個地區（挨拶の町／美食横丁／旅路の駅／言葉の城），
  每天 15 個單字＝一關（共 7 關），週末是**文法 BOSS**（考該週 3 個文法點）。線性解鎖。
- **復習戰**：答錯的題目（單字/假名/文法）進錯題本，變成「錯題百目鬼」；
  同一題**答對兩次**才會從錯題本消除，答錯會加重。

## 架構

| 檔案 | 職責 |
|---|---|
| `js/data.js` | 學習資料，從原專案 nihongo.html 抽出（HIRA/KATA 假名、VDB 420 單字、GDB 12 文法、REF 速查） |
| `js/engine.js` | 純邏輯：出題（含干擾項）、戰鬥數值、養成成長曲線、關卡表、存檔。不碰 DOM |
| `js/assets.js` | 素材載入：有圖用圖，缺圖自動 fallback 成漸層＋emoji |
| `js/game.js` | UI 與流程：五畫面（標題/夥伴之家/地圖/戰鬥/結算）、WebAudio 合成音效 |
| `tools/gen_images.py` | 用本機 SD Forge API（AOM3A3）生成 17 張素材到 `assets/img/` |

## 測試掛鉤

preview 隱藏分頁下合成點擊不可靠，用 `window.NQ`：
`NQ.state()` 存檔、`NQ.battle()` 戰鬥狀態、`NQ.startStage('w1d1'|'review')`、
`NQ.answer(i)`、`NQ.cheat.xp(n)`。

## 開發

- 預覽：`D:\claude\.claude\launch.json` 的 `nihongo-quest`（port 8874）。
- 重生素材：先啟動 Forge API（`run_api.bat`），跑
  `python tools/gen_images.py --only pet_1,boss_w4` 可只重生指定圖。
- 敵人小怪每天用 hue-rotate 換色增加變化，不用另生圖。

## V1 的取捨

- 文法題庫共 48 題固定題（來自原專案），BOSS 打久會重複——之後可做題目變形。
- 沒有裝備/技能樹；好感度與進化是唯二成長軸。
- 假名題干擾項排除同音，但未做「形近字」（ソ/ン/シ/ツ）特別混淆。
- 音效為 WebAudio 合成短音，無 BGM。
