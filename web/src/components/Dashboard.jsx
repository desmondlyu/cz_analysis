import React, { useState, useMemo, useEffect, useRef } from 'react';
import DataGrid from './DataGrid';
import ChartPreview from './ChartPreview';
import { 
  parseExcelFiles, 
  exportWorkbook, 
  getJudge, 
  getTypJudge, 
  calculateValueSpecRatio,
  buildSummary 
} from '../utils/excelProcessor';

// A beautiful custom Multi-Select Dropdown component
function MultiSelectDropdown({ 
  label, 
  options, 
  selected, 
  onChange, 
  displayFormatter = (val) => val,
  hasSearch = false,
  placeholder = "搜尋...",
  filterFunction = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange(options);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const filteredOptions = filterFunction 
    ? options.filter(opt => filterFunction(opt, searchTerm))
    : options.filter(opt => 
        String(displayFormatter(opt)).toLowerCase().includes(searchTerm.toLowerCase())
      );

  const getDisplayText = () => {
    if (selected.length === 0) return '無選擇';
    if (selected.length === options.length) return '全部';
    return `已選 ${selected.length} 項`;
  };

  return (
    <div className="multiselect-dropdown-container" ref={dropdownRef}>
      <label className="dropdown-label">{label}</label>
      <button 
        type="button"
        className={`dropdown-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="trigger-text">{getDisplayText()}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow-icon" style={{ flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-popover">
          <div className="popover-quick-ops">
            <span className="op-link" onClick={handleSelectAll}>全選</span>
            <span className="op-link" onClick={handleClearAll}>清空</span>
          </div>

          {hasSearch && (
            <div className="popover-search">
              <input 
                type="text" 
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="popover-search-input"
              />
            </div>
          )}

          <div className="popover-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isChecked = selected.includes(opt);
                return (
                  <label key={opt} className="popover-option-item">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(opt)}
                    />
                    <span className="option-text">{displayFormatter(opt)}</span>
                  </label>
                );
              })
            ) : (
              <div className="popover-no-results">無相符結果</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onBackToLanding }) {
  // 1. Data States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const [transferData, setTransferData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [datasheetSpecs, setDatasheetSpecs] = useState([]);
  const [summary, setSummary] = useState({ sectionA: [], sectionB: [] });

  // For reset purposes
  const [originalCompareData, setOriginalCompareData] = useState([]);
  const [originalDatasheetSpecs, setOriginalDatasheetSpecs] = useState([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'grid', 'chart'
  const [chartMetric, setChartMetric] = useState('average'); // 'average', 'max', 'min'

  // Chart tab multi-select states
  const [chartGroupFilter, setChartGroupFilter] = useState('All');
  const [chartSelectedVccs, setChartSelectedVccs] = useState([]);
  const [chartSelectedVios, setChartSelectedVios] = useState([]);
  const [chartSelectedTemps, setChartSelectedTemps] = useState([]);
  const [chartSelectedJudges, setChartSelectedJudges] = useState(['Fail']); // Default only FAIL
  const [chartSelectedAligns, setChartSelectedAligns] = useState([]);
  const [chartSelectedItems, setChartSelectedItems] = useState([]);

  const toggleSelection = (list, setList, val) => {
    if (list.includes(val)) {
      setList(list.filter(x => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  const uniqueVccOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.vcc)));
    return Array.from(set).sort((a,b) => parseFloat(a)-parseFloat(b));
  }, [compareData]);

  const uniqueVioOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.vio)));
    return Array.from(set).sort((a,b) => parseFloat(a)-parseFloat(b));
  }, [compareData]);

  const uniqueTempOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.temp)));
    return Array.from(set).sort((a,b) => parseFloat(a)-parseFloat(b));
  }, [compareData]);

  const uniqueAlignOptions = useMemo(() => {
    const set = new Set(compareData.map(r => r.alignment || 'N/A'));
    return Array.from(set).sort();
  }, [compareData]);

  const uniqueItemOptions = useMemo(() => {
    const set = new Set(compareData.map(r => r.item));
    return Array.from(set).sort();
  }, [compareData]);

  const filteredCompareData = useMemo(() => {
    return compareData.filter(row => {
      // 1. Group
      if (chartGroupFilter !== 'All' && row.group !== chartGroupFilter) return false;

      // 2. VCC (Multi-select filter)
      if (chartSelectedVccs.length > 0 && !chartSelectedVccs.includes(String(row.vcc))) return false;

      // 3. VIO (Multi-select filter)
      if (chartSelectedVios.length > 0 && !chartSelectedVios.includes(String(row.vio))) return false;

      // 4. Temp (Multi-select filter)
      if (chartSelectedTemps.length > 0 && !chartSelectedTemps.includes(String(row.temp))) return false;

      // 5. Judge (Multi-select filter)
      let jVal = row.judge ? String(row.judge).trim() : 'Blank';
      if (jVal === '') jVal = 'Blank';
      if (chartSelectedJudges.length > 0 && !chartSelectedJudges.map(v => v.toLowerCase()).includes(jVal.toLowerCase())) return false;

      // 6. 4Byte_Alignment (Multi-select filter)
      const aVal = row.alignment || 'N/A';
      if (chartSelectedAligns.length > 0 && !chartSelectedAligns.map(v => v.toLowerCase()).includes(aVal.toLowerCase())) return false;

      // 7. Item (Multi-select filter)
      if (chartSelectedItems.length > 0 && !chartSelectedItems.includes(row.item)) return false;

      return true;
    });
  }, [
    compareData, chartGroupFilter,
    chartSelectedVccs, chartSelectedVios, chartSelectedTemps, 
    chartSelectedJudges, chartSelectedAligns, chartSelectedItems
  ]);

  // Map of original data for cell modifications highlighting
  const originalDataMap = useMemo(() => {
    const map = new Map();
    originalCompareData.forEach(row => {
      const key = `${row.product}_${row.temp}_${row.vcc}_${row.vio}_${row.metric}_${row.item}_${row.description}`;
      map.set(key, row);
    });
    return map;
  }, [originalCompareData]);

  // 2. Handle File Parsing
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsProcessing(true);
    setProgress(5);
    setUploadedFiles(files.map(f => f.name));

    try {
      const result = await parseExcelFiles(files, (p) => {
        setProgress(p);
      });

      setTransferData(result.transferData);
      setCompareData(result.compareData);
      setDatasheetSpecs(result.datasheetSpecs);
      setSummary(result.summary);

      // Save copies for resetting
      setOriginalCompareData(JSON.parse(JSON.stringify(result.compareData)));
      setOriginalDatasheetSpecs(JSON.parse(JSON.stringify(result.datasheetSpecs)));

      // Initialize chart multi-select filters
      const vccs = Array.from(new Set(result.compareData.map(r => String(r.vcc)))).sort((a,b) => parseFloat(a)-parseFloat(b));
      const vios = Array.from(new Set(result.compareData.map(r => String(r.vio)))).sort((a,b) => parseFloat(a)-parseFloat(b));
      const temps = Array.from(new Set(result.compareData.map(r => String(r.temp)))).sort((a,b) => parseFloat(a)-parseFloat(b));
      const aligns = Array.from(new Set(result.compareData.map(r => r.alignment || 'N/A'))).sort();
      const items = Array.from(new Set(result.compareData.map(r => r.item))).sort();

      setChartSelectedVccs(vccs);
      setChartSelectedVios(vios);
      setChartSelectedTemps(temps);
      setChartSelectedAligns(aligns);
      setChartSelectedItems(items);

      setActiveTab('summary');
    } catch (error) {
      console.error(error);
      alert(`解析檔案時發生錯誤：\n${error.message}`);
      setUploadedFiles([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Cell Changes
  const handleCellValueChange = (index, field, newValStr) => {
    const newVal = newValStr === '' ? null : parseFloat(newValStr);
    
    // Deep copy current states
    const updatedCompareData = [...compareData];
    const targetRow = { ...updatedCompareData[index] };
    
    const updatedSpecs = [...datasheetSpecs];

    if (field === 'value') {
      // 3.1. Edit Value: simple recalculation for this single row
      targetRow.value = newVal;
      targetRow.judge = getJudge(
        newVal, 
        targetRow.specMin, 
        targetRow.specMax, 
        targetRow.judgeCriteria, 
        targetRow.item
      );
      targetRow.typ_judge = getTypJudge(
        newVal, 
        targetRow.specTyp, 
        targetRow.metric, 
        targetRow.temp, 
        targetRow.vcc
      );
      targetRow.value_spec_ratio = calculateValueSpecRatio(
        newVal, 
        targetRow.specMin, 
        targetRow.specMax, 
        targetRow.judgeCriteria, 
        targetRow.item
      );
      
      updatedCompareData[index] = targetRow;
    } else {
      // 3.2. Edit Spec (specMin, specTyp, specMax)
      // Since spec is shared across items with the same specRowIdx, we must update all rows sharing this specRowIdx
      const specRowIdx = targetRow.specRowIdx;
      
      // Update the datasheet spec array entry
      const specIdx = updatedSpecs.findIndex(s => s.rowIdx === specRowIdx);
      if (specIdx !== -1) {
        const specToUpdate = { ...updatedSpecs[specIdx] };
        if (field === 'specMin') specToUpdate.min = newVal;
        if (field === 'specTyp') specToUpdate.typ = newVal;
        if (field === 'specMax') specToUpdate.max = newVal;
        updatedSpecs[specIdx] = specToUpdate;
      }

      // Synchronize all compare rows mapping to this specRowIdx and recalculate judgments
      updatedCompareData.forEach((row, rIdx) => {
        if (row.specRowIdx === specRowIdx) {
          const updatedRow = { ...row };
          
          if (field === 'specMin') updatedRow.specMin = newVal;
          if (field === 'specTyp') updatedRow.specTyp = newVal;
          if (field === 'specMax') updatedRow.specMax = newVal;

          // Recalculate Verdicts based on new spec values
          updatedRow.judge = getJudge(
            updatedRow.value, 
            updatedRow.specMin, 
            updatedRow.specMax, 
            updatedRow.judgeCriteria, 
            updatedRow.item
          );
          updatedRow.typ_judge = getTypJudge(
            updatedRow.value, 
            updatedRow.specTyp, 
            updatedRow.metric, 
            updatedRow.temp, 
            updatedRow.vcc
          );
          updatedRow.value_spec_ratio = calculateValueSpecRatio(
            updatedRow.value, 
            updatedRow.specMin, 
            updatedRow.specMax, 
            updatedRow.judgeCriteria, 
            updatedRow.item
          );

          updatedCompareData[rIdx] = updatedRow;
        }
      });
    }

    // Recalculate Summary Section A / B lists
    const newSummary = buildSummary(updatedCompareData);

    // Update state
    setCompareData(updatedCompareData);
    setDatasheetSpecs(updatedSpecs);
    setSummary(newSummary);
  };

  // 4. Reset Changes
  const handleResetAll = () => {
    if (!originalCompareData.length) return;
    if (window.confirm('確定要捨棄所有手動修改，還原成原始 Excel 數據嗎？')) {
      const resetCompare = JSON.parse(JSON.stringify(originalCompareData));
      const resetSpecs = JSON.parse(JSON.stringify(originalDatasheetSpecs));
      const resetSummary = buildSummary(resetCompare);
      
      setCompareData(resetCompare);
      setDatasheetSpecs(resetSpecs);
      setSummary(resetSummary);
    }
  };

  // 5. Export Workbook
  const handleExport = async () => {
    if (!compareData.length) return;
    
    try {
      setIsProcessing(true);
      const buffer = await exportWorkbook(transferData, compareData, datasheetSpecs, summary);
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compare_output_modified.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`匯出 Excel 發生錯誤：\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="dashboard-navbar">
        <div className="nav-logo" onClick={onBackToLanding} style={{ cursor: 'pointer' }}>
          <svg className="logo-svg" viewBox="0 0 24 24" fill="none">
            <path d="M3 3V21H21" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 16L12 11L16 15L21 8" stroke="#0099ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">CZ <span className="highlight">ANALYTIC</span></span>
        </div>

        <div className="nav-actions">
          {compareData.length > 0 && (
            <button className="glow-btn export-btn" onClick={handleExport} disabled={isProcessing}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-small">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              匯出無損公式 Excel
            </button>
          )}
          <button className="back-btn" onClick={onBackToLanding}>
            返回首頁
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Upload Panel if no data */}
        {compareData.length === 0 ? (
          <div className="upload-box-card">
            <h2>上傳晶片特性測試報告 Excel 檔案</h2>
            <p className="card-desc">請選取或拖曳一個或多個 Excel 檔案以開始分析。系統將會解析 25°C、90°C、130°C、-45°C 等分頁的特性數據。</p>
            
            <div className="dropzone-area">
              <input 
                type="file" 
                multiple 
                accept=".xlsx, .xls" 
                id="excel-file-input" 
                onChange={handleFileUpload} 
                disabled={isProcessing}
              />
              <label htmlFor="excel-file-input" className="dropzone-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="upload-large-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <span>點擊選擇檔案 或 拖曳 Excel 檔案至此</span>
                <span className="file-hint">支援批次解析多個特性檔案</span>
              </label>
            </div>

            {isProcessing && (
              <div className="progress-container">
                <div className="progress-labels">
                  <span>檔案解析中...</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Data Loaded Layout */
          <div className="data-layout">
            
            {/* Left/Top Sidebar Info */}
            <div className="stats-strip">
              <div className="stat-card">
                <div className="stat-label">上傳檔案數</div>
                <div className="stat-value tabular-nums">{uploadedFiles.length}</div>
                <div className="stat-desc text-secondary truncate">{uploadedFiles.join(', ')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">解析實測點數</div>
                <div className="stat-value tabular-nums">{transferData.length}</div>
                <div className="stat-desc text-secondary">Raw Test Runs</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">比較列數</div>
                <div className="stat-value tabular-nums">{compareData.length}</div>
                <div className="stat-desc text-secondary">Aggregated by Temp/Vcc</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">不重複規格項目</div>
                <div className="stat-value tabular-nums">{datasheetSpecs.length}</div>
                <div className="stat-desc text-secondary">Datasheet Specs</div>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="tab-navigation">
              <div className="tab-buttons">
                <button 
                  className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M21 9H3M21 15H3M12 3v18"/>
                  </svg>
                  統計總覽 (Summary)
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
                  onClick={() => setActiveTab('grid')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
                    <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/>
                  </svg>
                  數據編輯表格 (Data Grid)
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  分析圖表預覽 (Charts)
                </button>
              </div>
              
              <div className="tab-extra">
                {activeTab === 'chart' && (
                  <div className="metric-selector">
                    <label>Y2 對照規格限：</label>
                    <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value)}>
                      <option value="average">Typ Spec (對應 Average)</option>
                      <option value="max">Max Spec (對應 Max)</option>
                      <option value="min">Min Spec (對應 Min)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Panels */}
            <div className="tab-panel-content">
              {/* Tab 1: Summary Panel */}
              {activeTab === 'summary' && (
                <div className="summary-tab-content">
                  
                  {/* Section A */}
                  <div className="summary-section-card">
                    <div className="card-header bg-fail-header">
                      <h3>A. Out of Datasheet Spec (Judge = Fail 或 Typ_Judge = Fail)</h3>
                      <span className="badge badge-fail">{summary.sectionA.length} 筆項目</span>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="summary-table">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Test Item</th>
                            <th>Spec Limit</th>
                            <th>Fail Conditions</th>
                            <th>Fail Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.sectionA.length > 0 ? (
                            summary.sectionA.map((row, idx) => (
                              <tr key={idx}>
                                <td className="center-text tabular-nums text-muted">{row.no}</td>
                                <td className="font-bold">{row.item}</td>
                                <td className="tabular-nums">{row.specValues}</td>
                                <td className="text-secondary text-small">{row.conditions}</td>
                                <td>
                                  <span className="badge badge-fail">{row.failType}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="center-text py-8 text-muted">
                                恭喜！無符合 Out of Spec 的 Fail 資料。
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section B */}
                  <div className="summary-section-card">
                    <div className="card-header bg-warn-header">
                      <h3>B. Pass but Spec is Marginal (Judge = Pass 且 Value_Spec_Ratio &lt; 1.05)</h3>
                      <span className="badge badge-warn">{summary.sectionB.length} 筆項目</span>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="summary-table">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Test Item</th>
                            <th>Marginal Conditions</th>
                            <th>Worst GuardBand (Value_Spec_Ratio)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.sectionB.length > 0 ? (
                            summary.sectionB.map((row, idx) => (
                              <tr key={idx}>
                                <td className="center-text tabular-nums text-muted">{row.no}</td>
                                <td className="font-bold">{row.item}</td>
                                <td className="text-secondary text-small">{row.conditions}</td>
                                <td className="tabular-nums font-bold text-warn">{row.minRatio}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="center-text py-8 text-muted">
                                無 Marginal (GuardBand &lt; 5%) 資料。
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Grid Panel */}
              {activeTab === 'grid' && (
                <DataGrid 
                  compareData={compareData}
                  originalDataMap={originalDataMap}
                  onCellValueChange={handleCellValueChange}
                  onResetAll={handleResetAll}
                />
              )}

              {/* Tab 3: Chart Panel */}
              {activeTab === 'chart' && (
                <div className="chart-tab-container">
                  {/* Group Tabs */}
                  <div className="chart-group-selector">
                    {['All', 'Time', 'Normal Read', 'DTR read', 'Except NR/DTR', 'DC'].map(g => (
                      <button
                        key={g}
                        className={`group-tab-btn ${chartGroupFilter === g ? 'active' : ''}`}
                        onClick={() => setChartGroupFilter(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  {/* Multi-Select Filters Panel */}
                  <div className="chart-multiselect-panel">
                    <MultiSelectDropdown 
                      label="VCC (多選)"
                      options={uniqueVccOptions}
                      selected={chartSelectedVccs}
                      onChange={setChartSelectedVccs}
                      displayFormatter={(v) => `${parseFloat(v).toFixed(2)}V`}
                    />

                    <MultiSelectDropdown 
                      label="VIO (多選)"
                      options={uniqueVioOptions}
                      selected={chartSelectedVios}
                      onChange={setChartSelectedVios}
                      displayFormatter={(v) => `${parseFloat(v).toFixed(2)}V`}
                    />

                    <MultiSelectDropdown 
                      label="溫度 (多選)"
                      options={uniqueTempOptions}
                      selected={chartSelectedTemps}
                      onChange={setChartSelectedTemps}
                      displayFormatter={(t) => `${parseFloat(t)}°C`}
                    />

                    <MultiSelectDropdown 
                      label="Judge (多選)"
                      options={['Pass', 'Fail', 'Blank']}
                      selected={chartSelectedJudges}
                      onChange={setChartSelectedJudges}
                    />

                    <MultiSelectDropdown 
                      label="Alignment (多選)"
                      options={uniqueAlignOptions}
                      selected={chartSelectedAligns}
                      onChange={setChartSelectedAligns}
                    />

                    <div className="span-two-cols">
                      <MultiSelectDropdown 
                        label="過濾 Item (多選 & 搜尋)"
                        options={uniqueItemOptions}
                        selected={chartSelectedItems}
                        onChange={setChartSelectedItems}
                        hasSearch={true}
                        placeholder="搜尋 Item 名稱或 Description..."
                        filterFunction={(item, search) => {
                          if (search.trim() === '') return true;
                          const searchLower = search.toLowerCase();
                          const matchDesc = compareData.some(r => r.item === item && (r.description || '').toLowerCase().includes(searchLower));
                          return item.toLowerCase().includes(searchLower) || matchDesc;
                        }}
                      />
                    </div>
                  </div>

                  {/* Chart Preview */}
                  <ChartPreview 
                    compareRecords={filteredCompareData}
                    metricKey={chartMetric}
                  />
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="fullscreen-overlay">
                <div className="overlay-content">
                  <div className="spinner"></div>
                  <p>正在重新處理與導出檔案，請稍候...</p>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
