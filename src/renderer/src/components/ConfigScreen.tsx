import { useState } from 'react';
import { useAppStore } from '../store';

function ConfigScreen(): JSX.Element {
  const { apiKey, setApiKey, setStep } = useAppStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSave() {
    const key = inputKey.trim();
    if (!key) {
      setLocalError('Please enter your OpenRouter API key');
      return;
    }
    setValidating(true);
    setLocalError(null);

    try {
      const saveResult = await window.electronAPI.setConfig({ apiKey: key });
      if (!saveResult.success) {
        setLocalError(saveResult.error ?? 'Failed to save API key');
        return;
      }
      setApiKey(key);
      setStep('mediatype');
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
        <label>OpenRouter API Key</label>
        <input
          type="password"
          placeholder="sk-or-v1-..."
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
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
