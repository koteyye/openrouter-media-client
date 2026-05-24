import { useAppStore } from '../store';

function ModeSelector(): JSX.Element {
  const { setGenerationMode, setStep } = useAppStore();

  function handleSelect(mode: 'text' | 'i2v') {
    setGenerationMode(mode);
    if (mode === 'i2v') {
      setStep('generate');
    } else {
      setStep('mediatype');
    }
  }

  function handleBack() {
    setStep('config');
  }

  return (
    <div className="config-screen">
      <h2>What do you want to do?</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Choose the generation mode.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          className="model-card"
          style={{ flexDirection: 'column', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}
          onClick={() => handleSelect('text')}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
          <div className="model-name" style={{ fontSize: '16px' }}>Text-to-Media</div>
          <div className="model-desc" style={{ fontSize: '13px' }}>
            Generate video or images from a text prompt
          </div>
        </div>

        <div
          className="model-card"
          style={{ flexDirection: 'column', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}
          onClick={() => handleSelect('i2v')}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️→🎬</div>
          <div className="model-name" style={{ fontSize: '16px' }}>Image-to-Video</div>
          <div className="model-desc" style={{ fontSize: '13px' }}>
            Generate video from an image + text prompt
          </div>
        </div>
      </div>

      <button className="btn btn-secondary" onClick={handleBack}>
        Back to API Key
      </button>
    </div>
  );
}

export default ModeSelector;
