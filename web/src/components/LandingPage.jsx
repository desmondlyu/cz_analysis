import React from 'react';

export default function LandingPage({ onLaunch }) {
  return (
    <div className="landing-page">
      {/* Decorative Cyber Background Grid & Glows */}
      <div className="cyber-grid"></div>
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Navigation */}
      <header className="landing-header">
        <div className="logo-area">
          <svg className="logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3V21H21" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 16L12 11L16 15L21 8" stroke="#0099ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="8" r="2" fill="var(--primary)"/>
          </svg>
          <span className="logo-text">CZ <span className="highlight">ANALYTIC</span></span>
        </div>
        <div className="header-status">
          <span className="pulse-dot"></span>
          <span className="status-label">Web Client Engine Ready</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="tech-badge">CORE EXTENSION FRAMEWORK v2.0</div>
          <h1>
            晶片特性測試數據 <br />
            <span className="gradient-text">即時互動式分析儀表板</span>
          </h1>
          <p className="hero-desc">
            將複雜的晶片特性 Excel 測試報告，轉化為 100% 瀏覽器端解析的高效能網頁應用。結合 React 虛擬狀態引擎，提供即時修改數值、圖表瞬時同步與公式無損導出的極致 Vibe 開發美學。
          </p>
          
          <div className="cta-container">
            <button className="glow-btn launch-btn" onClick={onLaunch}>
              啟動分析儀表板
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">ENGINE FEATURES / 系統核心技術</h2>
        <div className="features-grid">
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3>即時數據聯動更新 (Real-Time Reactive Chart)</h3>
            <p>
              運用 React 虛擬 DOM 與狀態同步技術，當您在表格中修改任何實測數據或 Datasheet 規格限，下方的 Vega-Lite 可視化圖表與 Pass/Fail 判定結果會立即重新計算並即時更新，無需重新上傳檔案。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3>無損公式 Excel 導出 (Lossless Formula Export)</h3>
            <p>
              內建底層 ExcelJS 引擎，導出時非單純寫入靜態字串，而是以 Excel 巢狀公式（含 <code>IF</code>, <code>ABS</code>, <code>OR</code>, <code>UPPER</code> 等）動態串接 <code>Compare</code> 頁與 <code>DATASHEET_SPEC</code> 頁。即使在 Excel 中重新修改規格，判定公式依然完美連動。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <h3>高密度統計分群 (Data-Dense Metrics Engine)</h3>
            <p>
              自動辨識 4-Byte Alignment（如 <code>=#1FF</code>）、分溫度分頁（如 25°C、-45°C）與 Vcc/VIO 多重電壓條件。於瀏覽器端高速彙整出 Average、Min、Max 等統計指標，提供直覺化的大規模測試分析。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>智慧判定與警示系統 (Verdict & Marginal Alarm)</h3>
            <p>
              除標準規格判定（Judge）外，獨家支援 Typical 典型值比對（Typ_Judge）與邊際值警戒警示（Marginal Alarm）。當實測值 Pass 但與規格限比小於 1.05 時，系統將自動納入邊際清單，為良率控管把關。
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 CZ Dataset Analyzer Core. Powered by React & Vega-Lite.</p>
      </footer>
    </div>
  );
}
