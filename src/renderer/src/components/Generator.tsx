import { useState } from 'react';
import { useAppStore } from '../store';
import type { VideoGenerateParams } from '../../../shared/ipc-types';

type GenStage = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

function Generator(): JSX.Element {
  const { selectedModel, selectedModelData, setStep } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [size, setSize] = useState('');
  const [duration, setDuration] = useState('');
  const [seed, setSeed] = useState('');
  const [generateAudio, setGenerateAudio] = useState(true);

  const [stage, setStage] = useState<GenStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  const resolutions = selectedModelData?.supported_resolutions ?? [];
  const aspectRatios = selectedModelData?.supported_aspect_ratios ?? [];
  const sizes = selectedModelData?.supported_sizes ?? [];

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const params: VideoGenerateParams = { prompt: trimmed };
    if (resolution) params.resolution = resolution;
    if (aspectRatio) params.aspect_ratio = aspectRatio;
    if (size) params.size = size;
    if (duration && Number(duration) > 0) params.duration = Number(duration);
    if (seed && Number(seed) >= 0) params.seed = Number(seed);
    params.generate_audio = generateAudio;

    setError(null);
    setResultUrls([]);
    setJobId(null);
    setStage('submitting');

    const result = await window.electronAPI.generateVideo(params);
    if (!result.success) {
      setError(result.error ?? 'Failed to submit generation');
      setStage('error');
      return;
    }

    const { id, polling_url } = result.data!;
    setJobId(id);
    setStage('polling');
    startPolling(polling_url);
  }

  async function startPolling(pollingUrl: string) {
    const POLL_INTERVAL = 8000;
    const MAX_ATTEMPTS = 75;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const result = await window.electronAPI.pollVideo(pollingUrl);
      if (!result.success) {
        setError(result.error ?? 'Polling failed');
        setStage('error');
        return;
      }

      const status = result.data!;
      if (status.status === 'completed') {
        setResultUrls(status.unsigned_urls ?? []);
        setStage('done');
        return;
      }

      if (status.status === 'failed') {
        setError(status.error ?? 'Generation failed');
        setStage('error');
        return;
      }
    }

    setError('Timed out waiting for generation');
    setStage('error');
  }

  function handleNew() {
    setPrompt('');
    setResolution('');
    setAspectRatio('');
    setSize('');
    setDuration('');
    setSeed('');
    setStage('idle');
    setError(null);
    setResultUrls([]);
    setJobId(null);
  }

  function handleBack() {
    setStep('model');
  }

  const modelLabel = selectedModel.split('/').pop() ?? selectedModel;

  return (
    <div className="generator">
      <h2>Generate — {modelLabel}</h2>

      {stage === 'idle' && (
        <>
          <div className="field">
            <label>Prompt *</label>
            <textarea
              placeholder="Describe what you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>

          {resolutions.length > 0 && (
            <div className="field">
              <label>Resolution</label>
              <select value={resolution} onChange={(e) => { setResolution(e.target.value); setSize(''); }}>
                <option value="">Default</option>
                {resolutions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {aspectRatios.length > 0 && (
            <div className="field">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => { setAspectRatio(e.target.value); setSize(''); }}>
                <option value="">Default</option>
                {aspectRatios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="field">
              <label>Size</label>
              <select value={size} onChange={(e) => { setSize(e.target.value); setResolution(''); }}>
                <option value="">Default</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label>Duration (seconds)</label>
            <input
              type="number"
              min={1}
              placeholder="Default"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Seed (for deterministic output)</label>
            <input
              type="number"
              min={0}
              placeholder="Random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </div>

          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <label style={{ minWidth: '0' }}>Generate Audio</label>
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(e) => setGenerateAudio(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!prompt.trim()}
          >
            Generate
          </button>
        </>
      )}

      {(stage === 'submitting' || stage === 'polling') && (
        <div className="result-area">
          <div className="flex-row">
            <span className="spinner" />
            <span>
              {stage === 'submitting'
                ? 'Submitting generation request...'
                : `Generating... ${jobId ? `(Job: ${jobId.slice(0, 8)}...)` : ''}`}
            </span>
          </div>
          {stage === 'polling' && (
            <div className="progress-bar">
              <div className="fill" style={{ width: '100%' }} />
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            This may take several minutes. Please wait...
          </p>
        </div>
      )}

      {stage === 'done' && (
        <div className="result-area">
          <div className="success-msg">Generated successfully!</div>
          {resultUrls.length > 0 && (
            <div className="video-urls">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Results:</p>
              {resultUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  Result {i + 1}
                </a>
              ))}
            </div>
          )}
          <div className="flex-row">
            <button className="btn btn-primary" onClick={handleNew}>
              New Generation
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="result-area">
          <div className="error-msg">{error}</div>
          <div className="flex-row">
            <button className="btn btn-primary" onClick={handleNew}>
              Try Again
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-secondary" onClick={handleBack}>
        Back to Models
      </button>
    </div>
  );
}

export default Generator;
