import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from './store';
import { LanguageProvider, useT } from './i18n/LanguageContext';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';

import logoIcon from '../../assets/icons/openrouter_media_client_logo.png';
import settingsIcon from '../../assets/icons/global_settings.png';
import refreshIcon from '../../assets/icons/refrash.png';
import rusIcon from '../../assets/icons/rus.png';
import engIcon from '../../assets/icons/eng.png';

function AppInner(): JSX.Element {
  const store = useAppStore();
  const { showSettings, setShowSettings, apiKey, localFolder, credits, setCredits, setRefreshCredits, lang, setLang } = store;
  const t = useT();
  const [loadingCredits, setLoadingCredits] = useState(false);

  const loadCredits = useCallback(async () => {
    if (!apiKey) return;
    setLoadingCredits(true);
    try {
      const result = await window.electronAPI.creditsFetch();
      if (result.success && result.data) {
        const remaining = result.data.total_credits - result.data.total_usage;
        setCredits(Math.max(0, remaining));
      } else {
        setCredits(null);
      }
    } catch {
      setCredits(null);
    } finally {
      setLoadingCredits(false);
    }
  }, [apiKey, setCredits]);

  // Store the refresh function in Zustand so Dashboard can call it
  useEffect(() => {
    setRefreshCredits(() => loadCredits);
  }, [loadCredits, setRefreshCredits]);

  useEffect(() => {
    async function loadConfig() {
      const result = await window.electronAPI.getConfig();
      if (result.success && result.data) {
        const config = result.data;
        store.setApiKey(config.apiKey || '');
        store.setImgbbApiKey(config.imgbbApiKey || '');
        store.setLocalFolder(config.localFolder || '');
        store.setLang(config.lang === 'en' ? 'en' : 'ru');
        
        // If first launch (not configured), immediately show the settings screen
        if (!config.apiKey || !config.localFolder) {
          setShowSettings(true);
        }
      }
    }
    loadConfig();
  }, []);

  // Load credits whenever API key changes or settings close
  useEffect(() => {
    if (apiKey && !showSettings) {
      loadCredits();
    }
  }, [apiKey, showSettings, loadCredits]);

  const formatCredits = (val: number | null): string => {
    if (val === null) return '—';
    if (val >= 1) return `$${val.toFixed(2)}`;
    return `$${val.toFixed(4)}`;
  };

  const handleSetLang = (nextLang: 'ru' | 'en') => {
    setLang(nextLang);
    window.electronAPI.setConfig({ lang: nextLang });
  };

  return (
    <>
      <header className="app-header">
        <h1>
          <img src={logoIcon} className="logo-icon" alt="Logo" />
          Koteyye <span className="header-title-accent">Media Studio</span>
        </h1>
        <div className="header-actions">
          {apiKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {t('app.header.balance')}: <span style={{ color: credits !== null && credits < 1 ? 'var(--danger)' : 'var(--accent)' }}>{loadingCredits ? '...' : formatCredits(credits)}</span>
              </span>
              <button
                onClick={loadCredits}
                disabled={loadingCredits}
                title={t('app.header.refreshBalance')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', opacity: loadingCredits ? 0.4 : 0.7,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = loadingCredits ? '0.4' : '0.7'; }}
              >
                <img src={refreshIcon} alt="Refresh" style={{ width: '16px', height: '16px', objectFit: 'contain', animation: loadingCredits ? 'spin 1.2s linear infinite' : 'none' }} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('app.header.language')}</span>
            <button
              className={`language-btn ${lang === 'ru' ? 'active' : ''}`}
              title={t('app.header.rus')}
              onClick={() => handleSetLang('ru')}
            >
              <img src={rusIcon} alt="RU" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </button>
            <button
              className={`language-btn ${lang === 'en' ? 'active' : ''}`}
              title={t('app.header.eng')}
              onClick={() => handleSetLang('en')}
            >
              <img src={engIcon} alt="EN" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </button>
          </div>

          <button
            className="gear-btn"
            onClick={() => {
              // Only allow closing settings if API Key and localFolder are configured
              if (showSettings && (!apiKey || !localFolder)) {
                return;
              }
              setShowSettings(!showSettings);
            }}
            title={t('app.header.connectionSettings')}
          >
            <img src={settingsIcon} alt="Settings" />
          </button>
        </div>
      </header>

      <main className="app-main">
        {showSettings ? <SettingsScreen /> : <Dashboard />}
      </main>

      <footer className="app-footer">
        <div className="footer-left">
          <img src={logoIcon} className="cat-icon" alt="" />
          Koteyye Eco System
        </div>
        <div>© 2026 Koteyye. {t('app.footer.rightsReserved')}</div>
      </footer>
    </>
  );
}

function App(): JSX.Element {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
