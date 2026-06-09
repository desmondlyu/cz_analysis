import React, { useState, useMemo } from 'react';

export default function DataGrid({ 
  compareData, 
  originalDataMap, 
  onCellValueChange,
  onResetAll 
}) {
  // 1. Local UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTemp, setFilterTemp] = useState('All');
  const [filterVcc, setFilterVcc] = useState('All');
  const [filterJudge, setFilterJudge] = useState('Fail');
  const [filterTypJudge, setFilterTypJudge] = useState('All');
  const [filterGroup, setFilterGroup] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 2. Extract unique filter options from data
  const tempOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.temp)));
    return Array.from(set).sort();
  }, [compareData]);

  const vccOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.vcc)));
    return Array.from(set).sort();
  }, [compareData]);

  const groupOptions = useMemo(() => {
    const set = new Set(compareData.map(r => String(r.group)));
    return Array.from(set).sort();
  }, [compareData]);

  // 3. Filtered Data
  const filteredData = useMemo(() => {
    setCurrentPage(1); // Reset page on filter
    return compareData.filter(row => {
      // Search term
      const matchSearch = 
        String(row.item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.description).toLowerCase().includes(searchTerm.toLowerCase());
      
      // Temp
      const matchTemp = filterTemp === 'All' || String(row.temp) === filterTemp;
      
      // Vcc
      const matchVcc = filterVcc === 'All' || String(row.vcc) === filterVcc;

      // Group
      const matchGroup = filterGroup === 'All' || String(row.group) === filterGroup;

      // Judge
      let matchJudge = true;
      if (filterJudge !== 'All') {
        const j = row.judge ? String(row.judge).trim().toLowerCase() : 'blank';
        if (filterJudge === 'Blank') {
          matchJudge = j === 'blank' || j === '';
        } else {
          matchJudge = j === filterJudge.toLowerCase();
        }
      }

      // Typ Judge
      let matchTypJudge = true;
      if (filterTypJudge !== 'All') {
        const tj = row.typ_judge ? String(row.typ_judge).trim().toLowerCase() : 'blank';
        if (filterTypJudge === 'Blank') {
          matchTypJudge = tj === 'blank' || tj === '';
        } else {
          matchTypJudge = tj === filterTypJudge.toLowerCase();
        }
      }

      return matchSearch && matchTemp && matchVcc && matchGroup && matchJudge && matchTypJudge;
    });
  }, [compareData, searchTerm, filterTemp, filterVcc, filterGroup, filterJudge, filterTypJudge]);

  // 4. Pagination
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Helper to check if cell is modified from original
  const isCellModified = (row, field) => {
    const uniqueKey = `${row.product}_${row.temp}_${row.vcc}_${row.vio}_${row.metric}_${row.item}_${row.description}`;
    const orig = originalDataMap.get(uniqueKey);
    if (!orig) return false;

    if (field === 'value') return Number(row.value) !== Number(orig.value);
    if (field === 'specMin') return Number(row.specMin) !== Number(orig.specMin);
    if (field === 'specTyp') return Number(row.specTyp) !== Number(orig.specTyp);
    if (field === 'specMax') return Number(row.specMax) !== Number(orig.specMax);
    return false;
  };

  const handleValueChange = (row, field, newValStr) => {
    // Locate row index in the main compareData
    const mainIdx = compareData.findIndex(r => 
      r.product === row.product &&
      r.temp === row.temp &&
      r.vcc === row.vcc &&
      r.vio === row.vio &&
      r.metric === row.metric &&
      r.item === row.item &&
      r.description === row.description
    );
    if (mainIdx !== -1) {
      onCellValueChange(mainIdx, field, newValStr);
    }
  };

  return (
    <div className="datagrid-container">
      {/* Filters Bar */}
      <div className="grid-controls">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" className="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="搜尋項目名稱或 Description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          <div className="select-wrapper">
            <label>Group</label>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="All">全部</option>
              {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="select-wrapper">
            <label>溫度</label>
            <select value={filterTemp} onChange={(e) => setFilterTemp(e.target.value)}>
              <option value="All">全部</option>
              {tempOptions.map(t => <option key={t} value={t}>{t}°C</option>)}
            </select>
          </div>

          <div className="select-wrapper">
            <label>Vcc</label>
            <select value={filterVcc} onChange={(e) => setFilterVcc(e.target.value)}>
              <option value="All">全部</option>
              {vccOptions.map(v => <option key={v} value={v}>{parseFloat(v).toFixed(2)}V</option>)}
            </select>
          </div>

          <div className="select-wrapper">
            <label>Judge</label>
            <select value={filterJudge} onChange={(e) => setFilterJudge(e.target.value)}>
              <option value="All">全部</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Blank">空白</option>
            </select>
          </div>

          <div className="select-wrapper">
            <label>Typ Judge</label>
            <select value={filterTypJudge} onChange={(e) => setFilterTypJudge(e.target.value)}>
              <option value="All">全部</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Blank">空白</option>
            </select>
          </div>
        </div>

        <div className="action-buttons">
          <button className="reset-btn" onClick={onResetAll}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-small">
              <path d="M2.5 2v6h6M21.5 22v-6h-6"/>
              <path d="M22 11.5A10 10 0 0 0 9.5 2.5m-5.8 4.3a10 10 0 0 0 7.8 15.2"/>
            </svg>
            重設變更
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="table-responsive">
        <table className="dense-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Group</th>
              <th>Test Item</th>
              <th>Description</th>
              <th>Temp</th>
              <th>Vcc</th>
              <th>Metric</th>
              <th className="editable-hdr">Value (實測值)</th>
              <th className="editable-hdr">Min</th>
              <th className="editable-hdr">Typ</th>
              <th className="editable-hdr">Max</th>
              <th>Ratio</th>
              <th>Judge</th>
              <th>Typ_Judge</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                
                const valModified = isCellModified(row, 'value');
                const minModified = isCellModified(row, 'specMin');
                const typModified = isCellModified(row, 'specTyp');
                const maxModified = isCellModified(row, 'specMax');

                return (
                  <tr key={globalIndex} className={row.judge === 'Fail' || row.typ_judge === 'Fail' ? 'row-fail' : ''}>
                    <td className="center-text text-muted tabular-nums">{globalIndex}</td>
                    <td className="text-secondary">{row.group}</td>
                    <td className="font-bold">{row.item}</td>
                    <td className="text-secondary cell-desc" title={row.description}>{row.description}</td>
                    <td className="center-text tabular-nums">{parseFloat(row.temp)}°C</td>
                    <td className="center-text tabular-nums">{parseFloat(row.vcc).toFixed(2)}V</td>
                    <td className="text-secondary center-text">{row.metric}</td>
                    
                    {/* Editable Value */}
                    <td className={`editable-cell ${valModified ? 'cell-modified' : ''}`}>
                      <input 
                        type="number" 
                        step="any"
                        value={row.value === null || row.value === undefined ? '' : row.value}
                        onChange={(e) => handleValueChange(row, 'value', e.target.value)}
                        className="cell-input tabular-nums"
                      />
                    </td>

                    {/* Editable Min */}
                    <td className={`editable-cell ${minModified ? 'cell-modified' : ''}`}>
                      <input 
                        type="number" 
                        step="any"
                        value={row.specMin === null || row.specMin === undefined ? '' : row.specMin}
                        onChange={(e) => handleValueChange(row, 'specMin', e.target.value)}
                        className="cell-input tabular-nums"
                      />
                    </td>

                    {/* Editable Typ */}
                    <td className={`editable-cell ${typModified ? 'cell-modified' : ''}`}>
                      <input 
                        type="number" 
                        step="any"
                        value={row.specTyp === null || row.specTyp === undefined ? '' : row.specTyp}
                        onChange={(e) => handleValueChange(row, 'specTyp', e.target.value)}
                        className="cell-input tabular-nums"
                      />
                    </td>

                    {/* Editable Max */}
                    <td className={`editable-cell ${maxModified ? 'cell-modified' : ''}`}>
                      <input 
                        type="number" 
                        step="any"
                        value={row.specMax === null || row.specMax === undefined ? '' : row.specMax}
                        onChange={(e) => handleValueChange(row, 'specMax', e.target.value)}
                        className="cell-input tabular-nums"
                      />
                    </td>

                    {/* Ratio */}
                    <td className="right-text tabular-nums text-secondary">
                      {row.value_spec_ratio !== null && row.value_spec_ratio !== undefined
                        ? parseFloat(row.value_spec_ratio).toFixed(4)
                        : 'N/A'}
                    </td>

                    {/* Judge status */}
                    <td className="center-text">
                      {row.judge ? (
                        <span className={`badge badge-${row.judge.toLowerCase()}`}>
                          {row.judge}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>

                    {/* Typ Judge status */}
                    <td className="center-text">
                      {row.typ_judge ? (
                        <span className={`badge badge-${row.typ_judge.toLowerCase()}`}>
                          {row.typ_judge}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="14" className="center-text py-8 text-muted">
                  無符合篩選條件的比較資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="grid-pagination">
        <div className="page-info text-secondary">
          顯示第 {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} 至{' '}
          {Math.min(currentPage * pageSize, filteredData.length)} 筆，共{' '}
          <span className="font-bold text-white tabular-nums">{filteredData.length}</span> 筆資料
        </div>

        <div className="page-size-selector select-wrapper">
          <select 
            value={pageSize} 
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>每頁 10 筆</option>
            <option value={25}>每頁 25 筆</option>
            <option value={50}>每頁 50 筆</option>
            <option value={100}>每頁 100 筆</option>
          </select>
        </div>

        <div className="pagination-buttons">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="pager-btn"
          >
            上一頁
          </button>
          
          <span className="page-indicator tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="pager-btn"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}
