import { useEffect } from 'react';
import { useAppStore } from './store';
import ConfigScreen from './components/ConfigScreen';
import MediaTypeSelector from './components/MediaTypeSelector';
import ModelSelector from './components/ModelSelector';
import Generator from './components/Generator';

function App(): JSX.Element {
  const { step, apiKey, mediaType, selectedModel, setApiKey, setMediaType, setSelectedModel, setStep } = useAppStore();

  useEffect(() => {
    async function loadConfig() {
      const result = await window.electronAPI.getConfig();
      if (result.success && result.data) {
        const config = result.data;
        if (config.apiKey) {
          setApiKey(config.apiKey);
          if (config.selectedModel) {
            setSelectedModel(config.selectedModel);
            setMediaType((config.mediaType || 'video') as any);
            setStep('generate');
          } else if (config.mediaType) {
            setMediaType(config.mediaType as any);
            setStep('model');
          } else {
            setStep('mediatype');
          }
        }
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (apiKey) {
      window.electronAPI.setConfig({ apiKey });
    }
  }, [apiKey]);

  useEffect(() => {
    if (mediaType) {
      window.electronAPI.setConfig({ mediaType: mediaType as 'video' | 'image' });
    }
  }, [mediaType]);

  useEffect(() => {
    if (selectedModel) {
      window.electronAPI.setConfig({ selectedModel });
    }
  }, [selectedModel]);

  const steps = ['config', 'mediatype', 'model', 'generate'];
  const currentIdx = steps.indexOf(step);

  return (
    <>
      <header className="app-header">
        <h1>
          <span className={`status-dot ${apiKey ? 'connected' : 'disconnected'}`} />
          OpenRouter Media Client
        </h1>
        <div className="step-tracker">
          {steps.map((key, idx) => (
            <div
              key={key}
              className={`step ${key === step ? 'active' : ''} ${idx < currentIdx ? 'done' : ''}`}
            />
          ))}
        </div>
      </header>

      <main className="app-main">
        {step === 'config' && <ConfigScreen />}
        {step === 'mediatype' && <MediaTypeSelector />}
        {step === 'model' && <ModelSelector />}
        {step === 'generate' && <Generator />}
      </main>
    </>
  );
}

export default App;
