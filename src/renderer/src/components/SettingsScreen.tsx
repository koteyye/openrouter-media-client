import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../store';
import { useT } from '../i18n/LanguageContext';
import keyIcon from '../../../assets/icons/key.png';
import imageIcon from '../../../assets/icons/image.png';
import folderIcon from '../../../assets/icons/folder.png';
import catLogo from '../../../assets/icons/dashboard_logo.png';
import saveIcon from '../../../assets/icons/save.png';
import pingIcon from '../../../assets/icons/ping.png';
import viewIcon from '../../../assets/icons/view.png';
import contactIcon from '../../../assets/icons/contact.png';
import channelIcon from '../../../assets/icons/chanel.png';
import mailIcon from '../../../assets/icons/mail.png';
import networkIcon from '../../../assets/icons/network.png';
import closeIcon from '../../../assets/icons/close.png';

function SettingsTooltip({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="tooltip-wrapper settings-tooltip">
      <span className="tooltip-trigger">?</span>
      <span className="tooltip-content">{children}</span>
    </span>
  );
}

function SettingsScreen(): JSX.Element {
  const store = useAppStore();
  const t = useT();
  
  const [apiKey, setApiKey] = useState(store.apiKey);
  const [imgbbApiKey, setImgbbApiKey] = useState(store.imgbbApiKey || '');
  const [localFolder, setLocalFolder] = useState(store.localFolder || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePickFolder() {
    try {
      const result = await window.electronAPI.openDirectoryDialog();
      if (result.success && result.data) {
        setLocalFolder(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      setErrorMsg(t('settings.enterKeyToTest'));
      return;
    }
    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);
    try {
      const res = await window.electronAPI.testConnection(apiKey.trim());
      if (res.success && res.data) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setErrorMsg(res.error ?? t('settings.connectionTestError'));
      }
    } catch (err) {
      setTestResult('error');
      setErrorMsg((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const trimmedKey = apiKey.trim();
    const trimmedImgbb = imgbbApiKey.trim();
    const trimmedFolder = localFolder.trim();

    if (!trimmedKey) {
      setErrorMsg(t('settings.enterApiKey'));
      return;
    }
    if (!trimmedFolder) {
      setErrorMsg(t('settings.enterLocalFolder'));
      return;
    }

    setSaving(false);
    setErrorMsg(null);

    try {
      const saveResult = await window.electronAPI.setConfig({
        apiKey: trimmedKey,
        imgbbApiKey: trimmedImgbb,
        localFolder: trimmedFolder,
      });

      if (!saveResult.success) {
        setErrorMsg(saveResult.error ?? t('settings.saveFailed'));
        return;
      }

      // Update store
      store.setApiKey(trimmedKey);
      store.setImgbbApiKey(trimmedImgbb);
      store.setLocalFolder(trimmedFolder);

      // Back to dashboard
      store.setShowSettings(false);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  return (
    <div className="settings-grid">
      <div className="settings-left">
        <div className="settings-screen-header">
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{t('settings.title')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('settings.subtitle')}</p>
          </div>
          {store.apiKey && store.localFolder && (
            <button
              type="button"
              className="settings-close-btn"
              onClick={() => store.setShowSettings(false)}
              title={t('settings.returnToMain')}
              aria-label={t('settings.returnToMain')}
            >
              <img src={closeIcon} alt="" />
            </button>
          )}
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <div className="field">
          <label>
            OpenRouter API Key *
            <SettingsTooltip>
              {t('settings.apiKeyTooltip')}
            </SettingsTooltip>
            <span style={{ float: 'right', fontSize: '11px', fontWeight: 'normal' }}>
              {t('settings.getKeyAt')} <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>openrouter.ai/keys ↗</a>
            </span>
          </label>
          <div className="input-with-icon">
            <img src={keyIcon} className="input-icon" alt="" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              style={{
                position: 'absolute', right: '14px', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                padding: '4px', opacity: 0.7, transition: 'opacity 0.15s ease',
              }}
              title={showPassword ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              <img src={viewIcon} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            </button>
          </div>
        </div>

        <div className="field">
          <label>
            {t('settings.imgbbOptionalLabel')}
            <SettingsTooltip>
              {t('settings.imgbbTooltip')}
            </SettingsTooltip>
            <span style={{ float: 'right', fontSize: '11px', fontWeight: 'normal' }}>
              {t('settings.getKeyAt')} <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>api.imgbb.com ↗</a>
            </span>
          </label>
          <div className="input-with-icon">
            <img src={imageIcon} className="input-icon" alt="" />
            <input
              type="text"
              placeholder={t('settings.imgbbPlaceholder')}
              value={imgbbApiKey}
              onChange={(e) => setImgbbApiKey(e.target.value)}
            />
          </div>
          <div className="field-meta">
            {t('settings.imgbbFieldMeta')}
          </div>
        </div>

        <div className="field">
          <label>
            {t('settings.localFolderLabel')}
            <SettingsTooltip>
              {t('settings.localFolderTooltip')}
            </SettingsTooltip>
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <img src={folderIcon} className="input-icon" alt="" />
              <input
                type="text"
                readOnly
                placeholder={t('settings.folderPlaceholder')}
                value={localFolder}
                style={{ cursor: 'default' }}
              />
            </div>
            <button className="btn-secondary" onClick={handlePickFolder} style={{ padding: '0 16px' }}>
              {t('settings.selectFolder')}
            </button>
          </div>
          <div className="field-meta">
            {t('settings.folderHint')}
          </div>
        </div>

        <div className="warning-box">
          {t('settings.warningBox')}
        </div>

        <div className="settings-actions">
          <button
            className="settings-action-button primary"
            onClick={handleSave}
            disabled={saving}
            title={t('settings.save')}
          >
            <img src={saveIcon} alt="" />
            {t('settings.save')}
          </button>

          <button
            className="settings-action-button"
            onClick={handleTestConnection}
            disabled={testing}
            title={t('settings.testConnection')}
          >
            {testing ? (
              <span className="spinner" />
            ) : (
              <img src={pingIcon} alt="" />
            )}
            {t('settings.testConnection')}
          </button>
        </div>

        {testResult === 'success' && (
          <div className="success-msg" style={{ marginTop: '12px' }}>
            {t('settings.connectionSuccess')}
          </div>
        )}
      </div>

  <div className="settings-right">
    <div className="settings-right-card" style={{ flex: 1, justifyContent: 'center' }}>
      <div className="settings-cat-status">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginTop: '0px', color: 'var(--text-primary)' }}>
          {t('settings.connectionStatus')}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '240px', lineHeight: 1.4 }}>
          {t('settings.connectionStatusDesc')}
        </p>
      </div>

      <div className="settings-status-list">
            <div className="status-card">
              <div className="status-left">
                <img src={keyIcon} alt="" />
                <div className="status-info">
                  <div className="status-name">{t('settings.apiKeyConnected')}</div>
                  <div className="status-desc">
                    {store.apiKey ? t('settings.readyToUse') : t('settings.keyRequired')}
                  </div>
                </div>
              </div>
              <div className={`status-indicator ${store.apiKey ? 'success' : 'pending'}`}>
                {store.apiKey ? '✓' : '!'}
              </div>
            </div>

            <div className="status-card">
              <div className="status-left">
                <img src={imageIcon} alt="" />
                <div className="status-info">
                  <div className="status-name">ImgBB API Key</div>
                  <div className="status-desc">
                    {store.imgbbApiKey ? t('settings.readyToUse') : t('settings.optional')}
                  </div>
                </div>
              </div>
              <div className={`status-indicator ${store.imgbbApiKey ? 'success' : 'pending'}`}>
                {store.imgbbApiKey ? '✓' : '—'}
              </div>
            </div>

            <div className="status-card">
              <div className="status-left">
                <img src={folderIcon} alt="" />
                <div className="status-info">
                  <div className="status-name">{t('settings.resultsFolder')}</div>
                  <div className="status-desc">
                    {store.localFolder ? t('settings.folderSelected') : t('settings.pathRequired')}
                  </div>
                </div>
              </div>
              <div className={`status-indicator ${store.localFolder ? 'success' : 'pending'}`}>
                {store.localFolder ? '✓' : '!'}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-right-card settings-contact-card">
          <img src={catLogo} alt="" className="settings-contact-logo" />
          <h4 className="settings-contact-title">
            {t('settings.authorContacts')}
          </h4>
          <div className="settings-contact-list">
            <a href="https://t.me/koteyye" target="_blank" rel="noopener noreferrer" className="settings-contact-link">
              <img src={contactIcon} alt="" />
              <span>Telegram: <b>@koteyye</b></span>
            </a>
            <a href="https://t.me/ai_na_kolenke" target="_blank" rel="noopener noreferrer" className="settings-contact-link">
              <img src={channelIcon} alt="" />
              <span>{t('settings.telegramChannel')}<b>AI на коленке</b></span>
            </a>
            <div className="settings-contact-link">
              <img src={mailIcon} alt="" />
              <span>Mail: <b>koteyye@yandex.ru</b></span>
            </div>
            <a href="https://kotey-ye.ru" target="_blank" rel="noopener noreferrer" className="settings-contact-link">
              <img src={networkIcon} alt="" />
              <span>{t('settings.website')}<b>kotey-ye.ru</b></span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
