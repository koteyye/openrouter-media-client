import { useAppStore } from '../store';
import type { MediaType } from '../../../shared/ipc-types';

function MediaTypeSelector(): JSX.Element {
  const { mediaType, setMediaType, setStep } = useAppStore();

  function handleSelect(type: MediaType) {
    setMediaType(type);
    setStep('model');
  }

  function handleBack() {
    setStep('config');
  }

  return (
    <div className="config-screen">
      <h2>What do you want to generate?</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Choose the type of media you want to create.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          className="model-card"
          style={{ flexDirection: 'column', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}
          onClick={() => handleSelect('video')}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
          <div className="model-name" style={{ fontSize: '16px' }}>Video</div>
          <div className="model-desc" style={{ fontSize: '13px' }}>
            Generate videos from text prompts (async polling)
          </div>
        </div>

        <div
          className="model-card"
          style={{ flexDirection: 'column', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}
          onClick={() => handleSelect('image')}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
          <div className="model-name" style={{ fontSize: '16px' }}>Image</div>
          <div className="model-desc" style={{ fontSize: '13px' }}>
            Generate images from text prompts
          </div>
        </div>
      </div>

      <button className="btn btn-secondary" onClick={handleBack}>
        Back to API Key
      </button>
    </div>
  );
}

export default MediaTypeSelector;
