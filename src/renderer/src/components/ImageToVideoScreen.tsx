import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import type { OpenRouterModel, GenerationHistoryItem, VideoJobStatus, UploadedFrameImage } from '../../../shared/ipc-types';

type GenState =
  | 'idle'
  | 'uploading'
  | 'submitting'
  | 'polling'
  | 'completed'
  | 'failed';

function ImageToVideoScreen(): JSX.Element {
  const { i2vModels, i2vSelectedModel, i2vSelectedModelData, imgbbApiKey, setI2vModels, setI2vSelectedModel, setStep } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [duration, setDuration] = useState('');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [seed, setSeed] = useState('');

  const [firstFramePath, setFirstFramePath] = useState<string | null>(null);
  const [lastFramePath, setLastFramePath] = useState<string | null>(null);
  const [firstFrame, setFirstFrame] = useState<UploadedFrameImage | null>(null);
  const [lastFrame, setLastFrame] = useState<UploadedFrameImage | null>(null);
  const [firstFrameLoading, setFirstFrameLoading] = useState(false);
  const [lastFrameLoading, setLastFrameLoading] = useState(false);
  const [firstFrameError, setFirstFrameError] = useState<string | null>(null);
  const [lastFrameError, setLastFrameError] = useState<string | null>(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [genState, setGenState] = useState<GenState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [costData, setCostData] = useState<Record<string, unknown> | null>(null);

  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('pending');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const modelData = i2vSelectedModelData;
  const resolutions = modelData?.supported_resolutions ?? [];
  const aspectRatios = modelData?.supported_aspect_ratios ?? [];
  const durations = modelData?.supported_durations ?? [];
  const supportsLastFrame = modelData?.supported_frame_images?.includes('last_frame') ?? false;

  const polling = usePolling({
    pollFn: async (jobId: string) => {
      const result = await window.electronAPI.i2vPoll(jobId);
      return result;
    },
    interval: 5000,
    maxAttempts: 1000,
    onStatus: (status: VideoJobStatus) => {
      setApiStatus(status.status);
    },
    onCompleted: (status: VideoJobStatus) => {
      setResultUrls(status.unsigned_urls ?? []);
      setCostData(status.usage ?? null);
      setGenState('completed');
      setVideoError(null);
      loadHistory();
    },
    onError: (msg) => {
      setError(msg);
      setGenState('failed');
    },
  });

  useEffect(() => {
    loadModels();
    loadHistory();
    return () => { polling.abort(); };
  }, []);

  async function loadModels() {
    setLoadingModels(true);
    const result = await window.electronAPI.i2vGetModels();
    setLoadingModels(false);
    if (result.success && result.data?.length) {
      const models = result.data;
      setI2vModels(models);
      if (i2vSelectedModel) {
        const currentModel = models.find((m) => m.id === i2vSelectedModel);
        if (currentModel) {
          setI2vSelectedModel(currentModel.id, currentModel);
        } else {
          const defaultModel = models.find((m) => m.id === 'alibaba/wan-2.7') ?? models[0];
          if (defaultModel) setI2vSelectedModel(defaultModel.id, defaultModel);
        }
      } else {
        const defaultModel = models.find((m) => m.id === 'alibaba/wan-2.7') ?? models[0];
        if (defaultModel) setI2vSelectedModel(defaultModel.id, defaultModel);
      }
    } else {
      setError(result.error ?? 'No I2V models found');
    }
  }

  async function loadHistory() {
    const result = await window.electronAPI.historyList();
    if (result.success && result.data) {
      setHistory(result.data.filter((h) => h.mode === 'image-to-video'));
    }
  }

  const handleSelectModel = useCallback((m: OpenRouterModel) => {
    setI2vSelectedModel(m.id, m);
    setResolution('');
    setAspectRatio('');
    setDuration('');
    setGenerateAudio(false);
  }, []);

  async function handlePickFirstFrame() {
    const result = await window.electronAPI.openFileDialog();
    if (result.success && result.data) {
      const filePath = result.data;
      setFirstFramePath(filePath);
      setFirstFrameLoading(true);
      setFirstFrameError(null);
      setFirstFrame(null);
      
      const uploadResult = await window.electronAPI.i2vUploadImage(filePath);
      setFirstFrameLoading(false);
      if (uploadResult.success && uploadResult.data) {
        setFirstFrame(uploadResult.data);
      } else {
        setFirstFrameError(uploadResult.error ?? 'Upload failed');
      }
    }
  }

  async function handlePickLastFrame() {
    const result = await window.electronAPI.openFileDialog();
    if (result.success && result.data) {
      const filePath = result.data;
      setLastFramePath(filePath);
      setLastFrameLoading(true);
      setLastFrameError(null);
      setLastFrame(null);

      const uploadResult = await window.electronAPI.i2vUploadImage(filePath);
      setLastFrameLoading(false);
      if (uploadResult.success && uploadResult.data) {
        setLastFrame(uploadResult.data);
      } else {
        setLastFrameError(uploadResult.error ?? 'Upload failed');
      }
    }
  }

  function handleClearFirstFrame() {
    setFirstFramePath(null);
    setFirstFrame(null);
    setFirstFrameError(null);
  }

  function handleClearLastFrame() {
    setLastFramePath(null);
    setLastFrame(null);
    setLastFrameError(null);
  }

  function canGenerate(): boolean {
    if (!i2vSelectedModel) return false;
    if (!prompt.trim() || prompt.trim().length < 3) return false;
    if (!firstFrame) return false; // Требуем именно загруженный фрейм
    if (firstFrameLoading || lastFrameLoading) return false; // Запрещаем генерацию во время аплода
    if (genState !== 'idle') return false;
    return true;
  }

  async function handleGenerate() {
    if (!canGenerate()) return;

    setError(null);
    setResultUrls([]);
    setJobId(null);
    setCostData(null);
    setApiStatus('pending');
    setVideoError(null);

    try {
      setGenState('submitting'); // Сразу переходим в submitting, так как картинки уже загружены!
      const genResult = await window.electronAPI.i2vGenerate({
        model: i2vSelectedModel,
        prompt: prompt.trim(),
        firstFrame: firstFrame!,
        lastFrame: lastFrame ?? undefined,
        resolution: resolution || undefined,
        aspectRatio: aspectRatio || undefined,
        duration: duration ? Number(duration) : undefined,
        generateAudio,
        seed: seed ? Number(seed) : undefined,
      } as any); // cast to any to handle type mismatch in typescript compilation dynamically

      if (!genResult.success) throw new Error(genResult.error ?? 'Generation request failed');

      const { id } = genResult.data!;
      setJobId(id);
      setGenState('polling');
      polling.start(id);
    } catch (err) {
      setError((err as Error).message);
      setGenState('failed');
    }
  }

  async function handleDownload() {
    if (!jobId) return;
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `openrouter-video-${jobId.slice(0, 8)}-${now}.mp4`;
    const saveResult = await window.electronAPI.saveFileDialog(defaultName);
    if (saveResult.success && saveResult.data) {
      const dl = await window.electronAPI.i2vDownload(jobId, saveResult.data);
      if (!dl.success) setError(dl.error ?? 'Download failed');
    }
  }

  async function handleDeleteFromHistory(id: string) {
    await window.electronAPI.historyDelete(id);
    await loadHistory();
  }

  async function handleCheckStatus(item: GenerationHistoryItem) {
    if (!item.jobId) return;
    setCheckingStatusId(item.id);
    try {
      await window.electronAPI.i2vPoll(item.jobId);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingStatusId(null);
      loadHistory();
    }
  }

  async function handleRerunFromHistory(item: GenerationHistoryItem) {
    polling.abort();
    setPrompt(item.prompt);
    setResolution(item.resolution ?? '');
    setAspectRatio(item.aspectRatio ?? '');
    setDuration(item.duration ? String(item.duration) : '');
    setGenerateAudio(item.generateAudio ?? false);
    setSeed(item.seed ? String(item.seed) : '');
    setFirstFramePath(null);
    setLastFramePath(null);
    setGenState('idle');
    setError(null);
    setResultUrls([]);
    setJobId(null);
    setApiStatus('pending');
    setVideoError(null);

    setTimeout(() => {
      document.getElementById('generate-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function handleBack() {
    polling.abort();
    setStep('mode');
  }

  const stateLabels: Record<GenState, string> = {
    idle: '',
    uploading: 'Uploading images to tmpfiles.org...',
    submitting: 'Submitting video generation request...',
    polling: `Generating video... Status: ${apiStatus.toUpperCase()} ${jobId ? `(${jobId.slice(0, 8)}...)` : ''}`,
    completed: 'Video generated successfully!',
    failed: 'Generation failed',
  };

  return (
    <div className="i2v-screen">
      {showHistory ? (
        <div className="i2v-history">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18 }}>Generation History</h2>
            <button className="btn btn-secondary" onClick={() => setShowHistory(false)} style={{ padding: '6px 14px' }}>
              Back to Generator
            </button>
          </div>
          {history.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No history yet.</p>
          )}
          {history.map((item) => (
            <div key={item.id} className="history-item" style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 14, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.model}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.prompt}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Status: {item.status} | {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {item.remoteUrls?.length > 0 && (
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => {
                        setResultUrls(item.remoteUrls);
                        setJobId(item.jobId ?? null);
                        setGenState('completed');
                        setVideoError(null);
                        setShowHistory(false);
                      }}>Open</button>
                  )}
                  {item.status !== 'completed' && item.status !== 'failed' && item.status !== 'cancelled' && item.status !== 'expired' && item.jobId && (
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, borderColor: 'var(--accent)' }}
                      disabled={checkingStatusId === item.id}
                      onClick={() => handleCheckStatus(item)}>
                      {checkingStatusId === item.id ? <span className="spinner" style={{ display: 'inline-block', width: 10, height: 10, marginRight: 4, verticalAlign: 'middle' }} /> : null}
                      Check Status
                    </button>
                  )}
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => { setShowHistory(false); handleRerunFromHistory(item); }}>Rerun</button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => handleDeleteFromHistory(item.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Image-to-Video</h2>
            <button className="btn btn-secondary" onClick={() => { loadHistory(); setShowHistory(true); }} style={{ padding: '6px 14px' }}>
              History ({history.length})
            </button>
          </div>

          <div className="field">
            <label>Model</label>
            {loadingModels ? (
              <div className="flex-row"><span className="spinner" />Loading models...</div>
            ) : (
              <select value={i2vSelectedModel} onChange={(e) => {
                const m = i2vModels.find((x) => x.id === e.target.value);
                if (m) handleSelectModel(m);
              }}>
                <option value="">Select a model...</option>
                {i2vModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
            )}
            <button className="btn btn-secondary" onClick={loadModels} style={{ fontSize: 12, padding: '4px 10px', marginTop: 6, alignSelf: 'flex-start' }}>
              Refresh models
            </button>
          </div>

          {modelData && (
            <div className="result-area" style={{ gap: 6 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>Resolutions:</strong> {(resolutions.length > 0 ? resolutions.join(', ') : 'Default')}
                {' | '}<strong>Aspect ratios:</strong> {(aspectRatios.length > 0 ? aspectRatios.join(', ') : 'Default')}
                {durations.length > 0 && <span>{' | '}<strong>Durations:</strong> {durations.join(', ')}s</span>}
                {modelData.pricing_skus && <span>{' | '}<strong>Pricing:</strong> {Object.values(modelData.pricing_skus).join(', ')}</span>}
              </div>
            </div>
          )}

          <div className="field">
            <label>Prompt * (min 3 characters)</label>
            <textarea
              placeholder="Describe what you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              autoFocus
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>{prompt.length} characters</div>
          </div>

          {resolutions.length > 0 && (
            <div className="field">
              <label>Resolution</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="">Default (720p)</option>
                {resolutions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {aspectRatios.length > 0 && (
            <div className="field">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="">Default (16:9)</option>
                {aspectRatios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <label>Duration (seconds)</label>
            {durations.length > 0 ? (
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="">Default ({durations[0]}s)</option>
                {durations.map((d) => <option key={d} value={d}>{d}s</option>)}
              </select>
            ) : (
              <input type="number" min={1} placeholder="5" value={duration} onChange={(e) => setDuration(e.target.value)} />
            )}
          </div>

          {modelData?.generate_audio !== false && (
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }} />
              <label style={{ cursor: 'pointer' }}>Generate Audio</label>
            </div>
          )}

          <div className="field">
            <label>Seed (optional)</label>
            <input type="number" min={0} placeholder="Random" value={seed} onChange={(e) => setSeed(e.target.value)} />
          </div>

          <div className="warning-msg">
            {imgbbApiKey ? (
              <>Images will be uploaded to your ImgBB account. Do not upload private, personal, or sensitive images.</>
            ) : (
              <>
                Images will be uploaded anonymously to Pixi.mg. For maximum stability in Russia without VPN,
                we highly recommend configuring a free <b>ImgBB API Key</b> in settings (api.imgbb.com).
              </>
            )}
          </div>

          <div id="generate-section" className="result-area" style={{ gap: 14 }}>
            <h3 style={{ fontSize: 15 }}>Frame Images</h3>

            {/* First Frame */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>First Frame *</label>
              {firstFrameLoading ? (
                <div className="flex-row" style={{ marginTop: 8 }}>
                  <span className="spinner" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {imgbbApiKey ? 'Uploading to ImgBB...' : 'Uploading to Pixi.mg...'}
                  </span>
                </div>
              ) : firstFrame ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <img src={firstFrame.url} alt="First frame" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>Uploaded Successfully</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {firstFrame.originalFileName}
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={handleClearFirstFrame} style={{ padding: '4px 10px', fontSize: 12 }}>Remove</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={handlePickFirstFrame}>Choose first frame</button>
                  {firstFrameError && (
                    <div className="error-msg" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12 }}>{firstFrameError}</div>
                  )}
                </div>
              )}
            </div>

            {/* Last Frame */}
            {supportsLastFrame && (
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last Frame (optional)</label>
                {lastFrameLoading ? (
                  <div className="flex-row" style={{ marginTop: 8 }}>
                    <span className="spinner" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {imgbbApiKey ? 'Uploading to ImgBB...' : 'Uploading to Pixi.mg...'}
                    </span>
                  </div>
                ) : lastFrame ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <img src={lastFrame.url} alt="Last frame" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>Uploaded Successfully</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastFrame.originalFileName}
                      </div>
                    </div>
                    <button className="btn btn-secondary" onClick={handleClearLastFrame} style={{ padding: '4px 10px', fontSize: 12 }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={handlePickLastFrame}>Choose last frame</button>
                    {lastFrameError && (
                      <div className="error-msg" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12 }}>{lastFrameError}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!canGenerate()}>
            {genState === 'idle' ? 'Generate Video' : <><span className="spinner" /> {stateLabels[genState]}</>}
          </button>

          {(genState === 'uploading' || genState === 'submitting' || genState === 'polling') && (
            <div className="result-area">
              <div className="flex-row">
                <span className="spinner" />
                <span>{stateLabels[genState]}</span>
              </div>
              {genState === 'polling' && <div className="progress-bar"><div className="fill" style={{ width: '100%' }} /></div>}
            </div>
          )}

          {genState === 'failed' && error && (
            <div className="error-msg">{error}</div>
          )}

          {genState === 'completed' && (
            <div className="result-area">
              <div className="success-msg">Video generated successfully!</div>
              {resultUrls.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                      Please use the <b>Result 1</b> link below to play it in your system browser, or click <b>Download Video</b>.
                    </div>
                  )}
                  <div className="video-urls">
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Results:</p>
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
                <button className="btn btn-primary" onClick={() => { polling.abort(); setGenState('idle'); setError(null); setResultUrls([]); setJobId(null); setFirstFramePath(null); setLastFramePath(null); }}>
                  New Generation
                </button>
                <button className="btn btn-secondary" onClick={handleDownload}>Download Video</button>
              </div>
            </div>
          )}
        </>
      )}

      <button className="btn btn-secondary" onClick={handleBack}>
        Back to Mode Selection
      </button>
    </div>
  );
}

export default ImageToVideoScreen;
