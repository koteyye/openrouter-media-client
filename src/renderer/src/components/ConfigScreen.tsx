import { useState } from 'react';
import { useAppStore } from '../store';

function ConfigScreen(): JSX.Element {
  const { apiKey, imgbbApiKey, setApiKey, setImgbbApiKey, setStep } = useAppStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputImgbbKey, setInputImgbbKey] = useState(imgbbApiKey || '');
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSave() {
    const key = inputKey.trim();
    const imgbbKey = inputImgbbKey.trim();
    if (!key) {
      setLocalError('Please enter your OpenRouter API key');
      return;
    }
    setValidating(true);
    setLocalError(null);

    try {
      const saveResult = await window.electronAPI.setConfig({ apiKey: key, imgbbApiKey: imgbbKey });
      if (!saveResult.success) {
        setLocalError(saveResult.error ?? 'Failed to save configuration');
        return;
      }
      setApiKey(key);
      setImgbbApiKey(imgbbKey);
      setStep('mode');
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="config-screen">
      <h2>Configure API Key</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Enter your OpenRouter API key to get started. You can get one at{' '}
        <a href="https://openrouter.ai/keys" style={{ color: 'var(--accent)' }}>
          openrouter.ai/keys
        </a>.
      </p>

      <div className="field">
        <label>OpenRouter API Key *</label>
        <input
          type="password"
          placeholder="sk-or-v1-..."
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
      </div>

      <div className="field">
        <label>ImgBB API Key (Optional, highly recommended for Russia without VPN)</label>
        <input
          type="password"
          placeholder="Get a free key instantly at api.imgbb.com"
          value={inputImgbbKey}
          onChange={(e) => setInputImgbbKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          By default, images are uploaded anonymously to Pixi.mg, which might be blocked by some firewalls/AVs.
          Provide your free API key from <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>api.imgbb.com</a> to load directly to ImgBB — 100% stable in Russia.
        </div>
      </div>

      {localError && <div className="error-msg">{localError}</div>}

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={validating || !inputKey.trim()}
      >
        {validating ? <><span className="spinner" /> Validating...</> : 'Continue'}
      </button>
    </div>
  );
}

export default ConfigScreen;
