import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import type { MediaType, OpenRouterModel } from '../../../shared/ipc-types';

function ModelSelector(): JSX.Element {
  const { models, setModels, mediaType, selectedModel, setSelectedModel, setStep, setError } = useAppStore();
  const [loading, setLoading] = useState(models.length === 0);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (models.length > 0) return;
    setError(null);
    setLoading(true);
    setLocalError(null);

    window.electronAPI.fetchModels((mediaType || 'video') as MediaType).then((result) => {
      setLoading(false);
      if (result.success) {
        setModels(result.data ?? []);
      } else {
        setLocalError(result.error ?? 'Failed to load models');
      }
    });
  }, [mediaType]);

  function handleSelect(modelId: string, modelData: OpenRouterModel) {
    setSelectedModel(modelId, modelData);
  }

  async function handleContinue() {
    if (!selectedModel) {
      setLocalError('Please select a model');
      return;
    }
    setError(null);
    const result = await window.electronAPI.setConfig({ selectedModel });
    if (result.success) {
      setStep('generate');
    } else {
      setLocalError(result.error ?? 'Failed to save model selection');
    }
  }

  function handleBack() {
    setStep('mediatype');
  }

  const mediaLabel = mediaType === 'video' ? 'Video' : 'Image';

  return (
    <div className="model-selector">
      <h2>Select a {mediaLabel} Model</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Choose a model for {mediaType === 'video' ? 'video' : 'image'} generation.
      </p>

      {loading && (
        <div className="flex-row">
          <span className="spinner" />
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading models...</span>
        </div>
      )}

      {localError && <div className="error-msg">{localError}</div>}

      {!loading && models.length === 0 && !localError && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          No {mediaLabel.toLowerCase()} models found. Try a different media type.
        </div>
      )}

      {models.length > 0 && (
        <>
          <div className="model-list">
            {models.map((m) => (
              <div
                key={m.id}
                className={`model-card ${selectedModel === m.id ? 'selected' : ''}`}
                onClick={() => handleSelect(m.id, m)}
              >
                <div className="model-info">
                  <div className="model-name">{m.name}</div>
                  <div className="model-desc">{m.description || 'No description'}</div>
                  {mediaType === 'video' && m.supported_resolutions && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      {m.supported_resolutions.join(', ')}
                    </div>
                  )}
                </div>
                <span className="model-badge">
                  {m.pricing_skus
                    ? Object.values(m.pricing_skus)[0]
                    : m.pricing?.image
                      ? `$${m.pricing.image}/img`
                      : 'pricing varies'}
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={!selectedModel}
          >
            Continue with {selectedModel ? selectedModel.split('/').pop() : '...'}
          </button>
        </>
      )}

      <button className="btn btn-secondary" onClick={handleBack}>
        Back to Media Type
      </button>
    </div>
  );
}

export default ModelSelector;
