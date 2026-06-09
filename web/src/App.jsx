import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'dashboard'

  return (
    <div className="app-root">
      {currentView === 'landing' ? (
        <LandingPage onLaunch={() => setCurrentView('dashboard')} />
      ) : (
        <Dashboard onBackToLanding={() => setCurrentView('landing')} />
      )}
    </div>
  );
}
