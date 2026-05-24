import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import type { VideoGenerateParams } from '../../../shared/ipc-types';

type GenStage = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

function Generator(): JSX.Element {
  const { selectedModel, selectedModelData, mediaType, setStep, setSelectedModel } = useAppStore();

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
  const [costData, setCostData] = useState<Record<string, unknown> | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('pending');
  const [videoError, setVideoError] = useState<string | null>(null);

  const isVideo = mediaType === 'video';
  const modelData = selectedModelData;
  const resolutions = modelData?.supported_resolutions ?? [];
  const aspectRatios = modelData?.supported_aspect_ratios ?? [];
  const sizes = modelData?.supported_sizes ?? [];

  const polling = usePolling({
    pollFn: async (jobId: string) => {
      const result = await window.electronAPI.pollVideo(`https://openrouter.ai/api/v1/videos/${jobId}`);
      return result;
    },
    interval: 8000,
    maxAttempts: 1000,
    onStatus: (status) => {
      setApiStatus(status.status);
    },
    onCompleted: (status) => {
      setResultUrls(status.unsigned_urls ?? []);
      setCostData(status.usage ?? null);
      setStage('done');
    },
    onError: (msg) => {
      setError(msg);
      setStage('error');
    },
  });

  useEffect(() => {
    if (selectedModel && !selectedModelData && mediaType) {
      window.electronAPI.fetchModels(mediaType).then((result) => {
        if (result.success && result.data) {
          const matched = result.data.find((m) => m.id === selectedModel);
          if (matched) {
            setSelectedModel(selectedModel, matched);
          }
        }
      });
    }
    return () => { polling.abort(); };
  }, [selectedModel, selectedModelData, mediaType]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setError(null);
    setResultUrls([]);
    setJobId(null);
    setCostData(null);
    setApiStatus('pending');
    setVideoError(null);

    if (isVideo) {
      setStage('submitting');
      const params: VideoGenerateParams = { prompt: trimmed };
      if (resolution) params.resolution = resolution;
      if (aspectRatio) params.aspect_ratio = aspectRatio;
      if (size) params.size = size;
      if (duration && Number(duration) > 0) params.duration = Number(duration);
      if (seed && Number(seed) >= 0) params.seed = Number(seed);
      params.generate_audio = generateAudio;

      const result = await window.electronAPI.generateVideo(params);
      if (!result.success) {
        setError(result.error ?? 'Failed to submit generation');
        setStage('error');
        return;
      }
      const { id } = result.data!;
      setJobId(id);
      setStage('polling');
      polling.start(id);
    } else {
      setStage('submitting');
      const result = await window.electronAPI.generateImage(trimmed);
      if (!result.success) {
        setError(result.error ?? 'Image generation failed');
        setStage('error');
        return;
      }
      setResultUrls(result.data!.urls);
      setCostData(result.data!.usage ?? null);
      setStage('done');
    }
  }

  function handleNew() {
    polling.abort();
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
    setVideoError(null);
  }

  function handleBack() {
    polling.abort();
    setStep('model');
  }

  async function handleDownload() {
    if (!jobId) return;
    if (isVideo) {
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultName = `openrouter-video-${jobId.slice(0, 8)}-${now}.mp4`;
      const saveResult = await window.electronAPI.saveFileDialog(defaultName);
      if (saveResult.success && saveResult.data) {
        const dl = await window.electronAPI.videoDownload(jobId, saveResult.data);
        if (!dl.success) setError(dl.error ?? 'Download failed');
      }
    }
  }

  const modelLabel = selectedModel.split('/').pop() ?? selectedModel;

  return (
    <div className="generator">
      <h2>{isVideo ? 'Generate Video' : 'Generate Image'} — {modelLabel}</h2>

      {(stage === 'idle' || stage === 'error') && (
        <>
          <div className="field">
            <label>Prompt *</label>
            <textarea
              placeholder={`Describe the ${isVideo ? 'video' : 'image'} you want to generate...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>

          {isVideo && (
            <>
              {resolutions.length > 0 && (
                <div className="field">
                  <label>Resolution</label>
                  <select value={resolution} onChange={(e) => { setResolution(e.target.value); setSize(''); }}>
                    <option value="">Default</option>
                    {resolutions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {aspectRatios.length > 0 && (
                <div className="field">
                  <label>Aspect Ratio</label>
                  <select value={aspectRatio} onChange={(e) => { setAspectRatio(e.target.value); setSize(''); }}>
                    <option value="">Default</option>
                    {aspectRatios.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )}
              {sizes.length > 0 && (
                <div className="field">
                  <label>Size</label>
                  <select value={size} onChange={(e) => { setSize(e.target.value); setResolution(''); }}>
                    <option value="">Default</option>
                    {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Duration (seconds)</label>
                <input type="number" min={1} placeholder="Default" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="field">
                <label>Seed</label>
                <input type="number" min={0} placeholder="Random" value={seed} onChange={(e) => setSeed(e.target.value)} />
              </div>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                <label style={{ cursor: 'pointer' }}>Generate Audio</label>
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!prompt.trim()}>
            {isVideo ? 'Generate Video' : 'Generate Image'}
          </button>
        </>
      )}

      {(stage === 'submitting' || stage === 'polling') && (
        <div className="result-area">
          <div className="flex-row">
            <span className="spinner" />
            <span>
              {stage === 'submitting' ? 'Submitting...' : `Generating... Status: ${apiStatus.toUpperCase()} ${jobId ? `(${jobId.slice(0, 8)}...)` : ''}`}
            </span>
          </div>
          {stage === 'polling' && <div className="progress-bar"><div className="fill" style={{ width: '100%' }} /></div>}
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>This may take several minutes.</p>
        </div>
      )}

      {stage === 'done' && (
        <div className="result-area">
          <div className="success-msg">Generated successfully!</div>
          {resultUrls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isVideo ? (
                <>
                  <video
                    src={`media-proxy://video?url=${encodeURIComponent(resultUrls[0])}`}
                    controls
                    onError={(e) => {
                      const err = e.currentTarget.error;
                      let msg = 'Preview not supported natively by Electron due to codec or format restrictions.';
                      if (err) {
                        if (err.code === 3) msg = 'Video decoding failed (unsupported codec or corrupted file).';
                        if (err.code === 4) msg = 'Video format/codec (e.g. H.265/HEVC) is not supported natively by Electron\'s built-in player.';
                        console.error('Video load error:', err.code, err.message);
                      }
                      setVideoError(msg);
                    }}
                    style={{ width: '100%', maxHeight: 360, borderRadius: 8, background: '#000' }}
                  />
                  {videoError && (
                    <div className="warning-msg" style={{ fontSize: 12, marginTop: 4, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
                      ⚠️ {videoError}<br />
                      Please use the <b>Direct links</b> below to play it in your system browser, or click <b>Download Video</b>.
                    </div>
                  )}
                </>
              ) : (
                <img src={resultUrls[0]} alt="Generated" style={{ width: '100%', borderRadius: 8 }} />
              )}
              <div className="video-urls">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Direct links:</p>
                {resultUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">Result {i + 1}</a>
                ))}
              </div>
            </div>
          )}
          {costData && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cost: ${String(costData.cost ?? 'N/A')}</div>
          )}
          <div className="flex-row">
            <button className="btn btn-primary" onClick={handleNew}>New Generation</button>
            {isVideo && <button className="btn btn-secondary" onClick={handleDownload}>Download Video</button>}
          </div>
        </div>
      )}

      {stage === 'error' && error && (
        <div className="result-area">
          <div className="error-msg">{error}</div>
          <div className="flex-row">
            <button className="btn btn-primary" onClick={handleNew}>Try Again</button>
          </div>
        </div>
      )}

      <button className="btn btn-secondary" onClick={handleBack}>Back to Models</button>
    </div>
  );
}

export default Generator;
