<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-06-10，Session c100efca
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
本專案為 **NOR FLASH 產品 FT 特性測試分析工具 (CZ Dataset Analysis Tool)**。
前端為 React 應用程式，使用 Vite 建置，並透過 `vite-plugin-singlefile` 套件將所有的 JS、CSS 直接內聯打包進單一 HTML 檔案（即 `index.html` 位於根目錄與 `web/dist/index.html`），以供地端離線時雙擊即可啟動、分析、並聯動更新圖表。

### 重要技術決策
| 技術決策項目 | 實作內容 | 解決痛點 |
| :--- | :--- | :--- |
| **儀表板頂部統計資訊更新 (Stats Cards Customization)** | 重新設計頂部統計卡片，依序顯示「產品名稱 (Product)」、「測試環境溫度數」、「測試項目數 (Test Items，單一溫度條件)」與「違反 DATASHEET SPEC 項目數」，且 Fail 個數大於 0 時會變更字體顏色為警示紅。 | 移除不直觀的底層「解析點數」等欄位，替換成與晶片測試環境、項目和良率直接掛鉤的關鍵指標。 |
| **儀表板字體放大 (Font Scaling)** | 調整 `index.css` 裡的全域 `body`、統計面板、表格、按鈕及下拉選單之字型大小（放大至 14px / 15px）。 | 解決儀表板文字過小、不易辨識的問題，大幅提升大螢幕下的閱讀舒適度。 |
| **數據編輯表格防跑位 (Input Buffering)** | 引入 `EditableCellInput` 受控緩衝輸入框（改在 `onBlur` 或 `Enter` 才提交變更），並將表格 `tr` 的 `key` 改為組合出的唯一識別字串（而非原先的 `globalIndex`）。 | 解決在數據編輯表格中修改 `Max/Min/Typ` 時，因頻繁觸發 React 重新 Render 與過濾導致清單跑位、焦點丟失 the Bug。 |
| **圖例說明卡片 (Chart Legend)** | 在圖表上方加入橫向說明的 Legend Card，並串接 CSS 主題變數變色。 | 讓使用者能一眼識別 `*` 號為實測值，紅色實線為規格線。 |
| **分層圖表縮放 (Vega-Lite Zoom/Pan)** | 將 `params` 的 `zoom_y` 選取限制在第一層 of unit spec 中，綁定 `scales` 限制為 `y` 軸，並支援雙擊還原。 | 解決 layered charts 外層不支援 params 造成空白的 Bug，且讓使用者能看清微小的波形變化。 |
| **獨立子圖表軸刻度 (Labels & Ticks)** | 讓同組 Group 的所有子圖表都開啟 Y 軸刻度值，但僅最左側顯示 Y 軸 Title。 | 避免在獨立縮放子圖表時因沒有 Y 軸刻度數字而不知當前數值的窘境。 |
| **高對比亮色主題 (High-Contrast Light Theme)** | 調整 `index.css` 的 `--text-primary` (`#020617`), `--text-secondary` (`#1e293b`), `--border-subtle` (`#94a3b8`)。 | 解決原本亮色主題在表格與框架上對比度不足、字體難以辨識的缺點。 |
| **首頁主題切換 (Landing Page Toggle)** | 串接 `theme` 與 `onToggleTheme` 到 `LandingPage` 組件並於 Header 加上主題切換鈕。 | 解決原本需要上傳檔案進入 Dashboard 才能切換主題的延遲體驗。 |
| **Git 分支整頓 (Branch Alignment)** | 移除遠端不小心產生的 `master` 分支，將所有提交 Rebase 後推送到唯一的 `main` 分支。 | 修正 upstream 機制，確保專案分支的乾淨與單一性。 |

### 固定設定值
- **開發伺服器埠號**：`3000`
- **主題儲存 LocalStorage Key**：`cz-theme`

### 已安裝的 Skills
- `myjob-work-tracker` (用於 MyJob 工作彙報追蹤技能)

### 尚未完成的功能 (TODO)
- [ ] 暫無 (所有需求已完美搞定並同步至 Repo！)

---

# 特性測試數據分析工具 (CZ Dataset Analysis Tool)

此工具用來分析 FT 特性資料，提供視覺化、統計化後的數據、圖表，並且適合提供給 JMP 作圖的資料結構

---

## 📋 功能簡介

### 1. 批次 Excel 上傳與解析
* 支援同時拖曳或選取多個特性測試 Excel 報告，請使用 PP22 提供的特性報告檔案，請留意 Excel 加密必須選擇 Public 避免無法解析
* 自動識別與解析包含 25°C、90°C、130°C、-45°C 等不同溫度分頁的測試數據。
* 自動讀取與整合測試條件中的 VCC、VIO、溫度、測量項目及對應的實測值。

### 2. 統計總覽面板 (Summary)
* **A. Out of Datasheet Spec (失效項目)**：自動彙總實測值或典型值判定為 `Fail` 的所有項目、測試電壓與溫度條件，便於快速定位失效點。
* **B. Pass but Spec is Marginal (邊際裕度不足)**：自動篩選出判定為 `Pass` 但量測值與規格極為接近的項目（邊際裕度小於 5%，即實測與規格比值 < 1.05），方便工程師提早預防潛在的良率風險。

### 3. 數據編輯表格 (Data Grid)
* **高密度分頁表格**：以高清晰度網格展示所有彙整後的測試數據與規格限。
* **即時搜尋與過濾**：可依輸入關鍵字對測試項目名稱 (Item) 與描述 (Description) 進行模糊搜尋，並支援 Group, 溫度, Vcc, Judge, Typ Judge 進行獨立快速過濾。
* **即時編輯與聯動計算 (Real-time recalculation)**：
  * 允許在網格內直接修改任何實測值 (Value) 或規格限制 (Min, Typ, Max)。
  * 任何修改都會立刻重新計算該行的判定 Verdict、比率 Ratio，並會以**黃色背景高亮標註該儲存格的修改狀態**。
  * 提供一鍵「重設變更」按鈕，隨時還原為原始 Excel 數據。

### 4. 分析圖表預覽 (Charts)
* **自動 Group 分群頁籤**：支援以橫向分頁切換 All, Time, Normal Read, DTR read 等群組，自動將大批圖表分類呈現。
* **雙層巢狀水平分欄排版**：
  * 圖表採外層依 `4Byte_Alignment` 水平分欄、內層依溫度 `Temp` 水平並排展示的雙層網格結構。
  * 所有子面板均共享左側高度一致的 Y 軸與下方對齊的 X 軸，以利橫向對照。
  * 圖表內的 X 軸項目（Item）預設會依據最大實測值自動**降序排列 (descending)**，方便優先觀察高值數據。
* **規格與實測標記**：
  * **實測點**以亮藍色星號 `*` 表示。
  * **規格限**以紅色水平段線 (Tick) 表示，只取 Max 或 Min 有值的一方作為規格參考線。
* **多選下拉式過濾器**：
  * 提供 `VCC`、`VIO`、`溫度`、`Judge`、`Alignment`、`過濾 Item` 六個獨立下拉式多選選單，各選單均支援「全選」與「清空」。
  * **搜尋與狀態記憶**：在 Item 下拉選單中輸入關鍵字過濾時，先前已經勾選的 Item 狀態會被穩定保持，不會因重新搜尋而重置。

### 5. 無損公式 Excel 導出
* 支援將網頁上修改後的數據與規格匯出為 Excel 檔案。
* 導出的 Compare 工作表內含動態 Excel 巢狀公式（含 `IF`, `ABS`, `OR`, `UPPER` 等），自動動態鏈結到 `DATASHEET_SPEC` 工作表。
* 開啟導出的 Excel 檔案後，在 Microsoft Excel 中修改規格限制，判定 Verdict 與良率 Ratio 依然會自動隨公式即時重新運算。

---

## 👥 作者與團隊

* **作者**：PP32 YPLu (Desmond Lyu)

---

## 📄 版權宣告 (License)

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 授權。

```text
MIT License

Copyright (c) 2026 PP32 YPLu (Desmond Lyu)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
