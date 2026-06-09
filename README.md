<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-06-09，Session 297e3f31
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
晶片特性驗證測試報告的 100% 本地端 React js 互動式分析儀表板，取代舊版 Tkinter 桌面工具 `CZ_dataset.py`。支援 Excel 解析、統計統計指標比對、規格判定，以及與 Excel 公式無損鏈結導出。

### 重要技術決策
| 項目 | 決策細節 | 狀態 |
|---|---|---|
| 多選篩選 | 將原本的 Chip 面板全面重構為 `MultiSelectDropdown` 下拉多選選單，增加 VCC, VIO, 溫度, Judge, Alignment, Item 下拉多選。 | 已完成 (2026-06-09) |
| Item 狀態記憶 | 在下拉選單內模糊搜尋過濾時，維持已選取項目的勾選狀態，避免搜尋時被強設全選覆蓋。 | 已完成 (2026-06-09) |
| 單檔編譯打包 | 透過 `vite-plugin-singlefile` 將 CSS 和 JS 全部 inline 寫入，構建出免安裝的獨立單檔 `dist/index.html`。 | 已完成 |

### 尚未完成的功能
- [ ] 考慮將 Python 桌面端 `CZ_dataset.py` 的篩選視窗也進行多選與搜尋記憶優化。

---

# 晶片特性測試數據分析工具 (CZ Dataset Analysis Tool)

這是一個專為半導體晶片特性驗證 (Characterization) 所開發的高密度數據互動式分析與視覺化工具。本工具 100% 運行於瀏覽器本地端，數據無須上傳至伺服器，確保測試資料的絕對隱私與安全。

---

## 📋 功能簡介

本工具旨在將繁雜的晶片特性測試 Excel 報告進行批次解析，自動計算統計量與判定規格限，並以直觀的高密度表格與互動式趨勢圖呈現。

### 1. 批次 Excel 上傳與解析
* 支援同時拖曳或選取多個特性測試 Excel 報告。
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
