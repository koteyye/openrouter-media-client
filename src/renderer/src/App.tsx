import { useEffect } from 'react';
import { useAppStore } from './store';
import type { MediaType } from '../../shared/ipc-types';
import ConfigScreen from './components/ConfigScreen';
import ModeSelector from './components/ModeSelector';
import MediaTypeSelector from './components/MediaTypeSelector';
import ModelSelector from './components/ModelSelector';
import Generator from './components/Generator';
import ImageToVideoScreen from './components/ImageToVideoScreen';

function App(): JSX.Element {
  const store = useAppStore();

  useEffect(() => {
    async function loadConfig() {
      const result = await window.electronAPI.getConfig();
      if (!result.success || !result.data) return;
      const config = result.data;
      if (!config.apiKey) return;

      store.setApiKey(config.apiKey);
      store.setImgbbApiKey(config.imgbbApiKey || '');

      if (config.generationMode === 'i2v') {
        store.setGenerationMode('i2v');
        if (config.i2vSelectedModel) {
          store.setI2vSelectedModel(config.i2vSelectedModel);
          store.setStep('generate');
        } else {
          store.setStep('model');
        }
      } else if (config.selectedModel) {
        store.setSelectedModel(config.selectedModel);
        store.setMediaType((config.mediaType || 'video') as MediaType);
        store.setGenerationMode('text');
        store.setStep('generate');
      } else if (config.mediaType) {
        store.setMediaType(config.mediaType as MediaType);
        store.setGenerationMode('text');
        store.setStep('model');
      } else {
        store.setStep('mode');
      }
    }
    loadConfig();
  }, []);

  useEffect(() => { if (store.apiKey) window.electronAPI.setConfig({ apiKey: store.apiKey }); }, [store.apiKey]);
  useEffect(() => { if (store.imgbbApiKey !== undefined) window.electronAPI.setConfig({ imgbbApiKey: store.imgbbApiKey }); }, [store.imgbbApiKey]);
  useEffect(() => { if (store.generationMode) window.electronAPI.setConfig({ generationMode: store.generationMode }); }, [store.generationMode]);
  useEffect(() => { if (store.mediaType) window.electronAPI.setConfig({ mediaType: store.mediaType as 'video' | 'image' }); }, [store.mediaType]);
  useEffect(() => { if (store.selectedModel) window.electronAPI.setConfig({ selectedModel: store.selectedModel }); }, [store.selectedModel]);
  useEffect(() => { if (store.i2vSelectedModel) window.electronAPI.setConfig({ i2vSelectedModel: store.i2vSelectedModel }); }, [store.i2vSelectedModel]);

  const steps = ['config', 'mode', 'mediatype', 'model', 'generate'];
  const currentIdx = steps.indexOf(store.step);
  const isI2v = store.generationMode === 'i2v' && (store.step === 'model' || store.step === 'generate');

  return (
    <>
      <header className="app-header">
        <h1>
          <span className={`status-dot ${store.apiKey ? 'connected' : 'disconnected'}`} />
          OpenRouter Media Client
        </h1>
        <div className="step-tracker">
          {steps.map((key, idx) => (
            <div
              key={key}
              className={`step ${key === store.step ? 'active' : ''} ${idx < currentIdx ? 'done' : ''}`}
            />
          ))}
        </div>
      </header>

      <main className="app-main">
        {store.step === 'config' && <ConfigScreen />}
        {store.step === 'mode' && <ModeSelector />}
        {store.step === 'mediatype' && !isI2v && <MediaTypeSelector />}
        {store.step === 'model' && !isI2v && <ModelSelector />}
        {store.step === 'generate' && !isI2v && <Generator />}
        {isI2v && <ImageToVideoScreen />}
      </main>
    </>
  );
}

export default App;
