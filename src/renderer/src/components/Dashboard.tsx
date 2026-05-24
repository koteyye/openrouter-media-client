import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { useT } from '../i18n/LanguageContext';
import { getPricingSkuKey } from '../i18n/translations';
import { usePolling } from '../hooks/usePolling';
import type { OpenRouterModel, GenerationHistoryItem, VideoJobStatus, UploadedFrameImage } from '../../../shared/ipc-types';
import type { LangKey } from '../i18n/translations';

import textToImgIcon from '../../../assets/icons/mode_text_to_image.png';
import imgToImgIcon from '../../../assets/icons/mode_image_to_image.png';
import imgToVideoIcon from '../../../assets/icons/mode_image_to_video.png';
import videoToVideoIcon from '../../../assets/icons/mode_text_to_video.png';

import gearIcon from '../../../assets/icons/global_settings.png';
import uploadIcon from '../../../assets/icons/global_upload.png';
import ratioIcon from '../../../assets/icons/param_aspect_ratio.png';
import dimIcon from '../../../assets/icons/param_dimensions.png';
import clockIcon from '../../../assets/icons/param_duration.png';
import audioIcon from '../../../assets/icons/param_audio.png';
import seedIcon from '../../../assets/icons/param_seed.png';
import catBigLogo from '../../../assets/icons/koteyye_media_studio_logo.png';
import folderIcon from '../../../assets/icons/folder.png';
import previewUnavailableIcon from '../../../assets/icons/preview_unavailable.png';
import historyEmptyIcon from '../../../assets/icons/history.png';
import refreshIcon from '../../../assets/icons/refrash.png';
import imageIcon from '../../../assets/icons/image.png';
import deleteIcon from '../../../assets/icons/delete.png';
import viewIcon from '../../../assets/icons/view.png';

type GenState = 'idle' | 'uploading' | 'submitting' | 'polling' | 'completed' | 'failed';

function formatPricingSku(key: string, valueStr: string, t: (key: LangKey) => string): string {
  let value = parseFloat(valueStr);
  
  // Конвертируем центы в доллары, если ключ начинается с cents_
  if (key.startsWith('cents_')) {
    value = value / 100;
  }
  
  // Форматируем значение цены в USD
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.01 ? (value < 0.0001 ? 7 : 4) : 2,
    maximumFractionDigits: 7
  });
  const formattedValue = formatter.format(value);

  const langKey = getPricingSkuKey(key);
  const description = langKey ? t(langKey) : `(${key.replace(/_/g, ' ')})`;
  return `${formattedValue} ${description}`;
}

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  renderOption?: (option: string) => React.ReactNode;
}

function CustomSelect({ options, value, onChange, renderOption }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select-value">
          {renderOption ? renderOption(value) : value}
        </span>
        <span className="custom-select-arrow">▼</span>
      </button>

      {isOpen && options.length > 0 && (
        <div className="custom-select-options">
          {options.map((opt) => (
            <div
              key={opt}
              className={`custom-select-option ${opt === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {renderOption ? renderOption(opt) : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderAspectRatioOption(ratioStr: string) {
  if (!ratioStr) return null;
  if (!ratioStr.includes(':')) {
    return <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{ratioStr}</span>;
  }
  
  const [w, h] = ratioStr.split(':').map(Number);
  const max = 16;
  let width = max;
  let height = max;
  
  if (w && h) {
    if (w > h) {
      height = Math.round((h / w) * max);
    } else if (h > w) {
      width = Math.round((w / h) * max);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div 
        style={{
          width: `${max}px`,
          height: `${max}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <div 
          style={{
            width: `${width}px`,
            height: `${height}px`,
            border: '1.5px solid var(--accent)',
            borderRadius: '2px',
            background: 'var(--accent-glow-strong)',
            boxShadow: '0 0 6px var(--accent-glow)',
            transition: 'all 0.15s ease'
          }}
        />
      </div>
      <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{ratioStr}</span>
    </div>
  );
}

function Dashboard(): JSX.Element {
  const store = useAppStore();
  const t = useT();
  const { activeTab, setActiveTab, apiKey, localFolder } = store;

  // Local inputs
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelData, setSelectedModelData] = useState<OpenRouterModel | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [duration, setDuration] = useState('');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [seed, setSeed] = useState('');
  
  // Image to video specific frame uploads
  const [firstFramePath, setFirstFramePath] = useState<string | null>(null);
  const [firstFrame, setFirstFrame] = useState<UploadedFrameImage | null>(null);
  const [firstFrameLoading, setFirstFrameLoading] = useState(false);
  const [firstFrameError, setFirstFrameError] = useState<string | null>(null);

  // EndFrame uploads (last frame)
  const [lastFramePath, setLastFramePath] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<UploadedFrameImage | null>(null);
  const [lastFrameLoading, setLastFrameLoading] = useState(false);
  const [lastFrameError, setLastFrameError] = useState<string | null>(null);

  // Reference Image uploads (Refimage)
  const [refImagePath, setRefImagePath] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<UploadedFrameImage | null>(null);
  const [refImageLoading, setRefImageLoading] = useState(false);
  const [refImageError, setRefImageError] = useState<string | null>(null);

  // Reference Audio uploads (Audioref)
  const [audioRefPath, setAudioRefPath] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<UploadedFrameImage | null>(null);
  const [audioRefLoading, setAudioRefLoading] = useState(false);
  const [audioRefError, setAudioRefError] = useState<string | null>(null);

  // Models state
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [genState, setGenState] = useState<GenState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollingStatusText, setPollingStatusText] = useState('PENDING');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeResultUrls, setActiveResultUrls] = useState<string[]>([]);
  const [activeLocalPaths, setActiveLocalPaths] = useState<string[]>([]);
  const [activeMediaType, setActiveMediaType] = useState<'image' | 'video'>('video');

  // History state
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [recovering, setRecovering] = useState(false);

  const isConfigured = !!apiKey && !!localFolder;
  const isVideoMode = activeTab === 'image-to-video' || activeTab === 'text-to-video';

  // Dynamic parameter support detection
  const supportsEndFrame = useMemo(() => {
    return activeTab === 'image-to-video' && !!selectedModelData?.supported_frame_images?.includes('last_frame');
  }, [selectedModelData, activeTab]);

  const supportsRefImage = useMemo(() => {
    return isVideoMode && !!selectedModelData?.allowed_passthrough_parameters?.some(
      p => p === 'input_references' || p === 'ref_image' || p === 'ref_images'
    );
  }, [selectedModelData, isVideoMode]);

  const supportsAudioRef = useMemo(() => {
    return isVideoMode && !!selectedModelData?.allowed_passthrough_parameters?.some(
      p => p.includes('audio')
    );
  }, [selectedModelData, isVideoMode]);

  const supportsAudio = useMemo(() => {
    return isVideoMode && selectedModelData?.generate_audio === true;
  }, [selectedModelData, isVideoMode]);

  const isImageTab = activeTab === 'text-to-image' || activeTab === 'image-to-image';

  const resolutions = useMemo(() => {
    if (isImageTab) {
      if (selectedModelData?.supported_sizes && selectedModelData.supported_sizes.length > 0) {
        return selectedModelData.supported_sizes;
      }
      if (selectedModelData?.supported_resolutions && selectedModelData.supported_resolutions.length > 0) {
        return selectedModelData.supported_resolutions;
      }
      return ['1K', '2K', '4K'];
    }
    return selectedModelData?.supported_resolutions ?? [];
  }, [selectedModelData, isImageTab]);

  const aspectRatios = useMemo(() => {
    if (isImageTab) {
      if (selectedModelData?.supported_aspect_ratios && selectedModelData.supported_aspect_ratios.length > 0) {
        return selectedModelData.supported_aspect_ratios;
      }
      return ['1:1', '16:9', '9:16', '3:2', '2:3', '4:3', '3:4', '21:9'];
    }
    return selectedModelData?.supported_aspect_ratios ?? [];
  }, [selectedModelData, isImageTab]);

  const durations = selectedModelData?.supported_durations ?? [];

  const pricingSkusEntries = selectedModelData?.pricing_skus ? Object.entries(selectedModelData.pricing_skus) : [];
  const allStandardPricingEntries = selectedModelData?.pricing 
    ? Object.entries(selectedModelData.pricing)
    : [];
  // Ключи pricing, нерелевантные для генерации медиа-контента
  const irrelevantPricingKeys = new Set(['web_search', 'input_cache_read', 'input_cache_write', 'internal_reasoning']);
  const nonZeroStandardEntries = allStandardPricingEntries.filter(
    (entry): entry is [string, string] => {
      const [key, val] = entry;
      return !!val && val !== '0' && parseFloat(val) > 0 && !irrelevantPricingKeys.has(key);
    }
  );
  const nonZeroSkuEntries = pricingSkusEntries.filter(
    (entry): entry is [string, string] => {
      const [, val] = entry;
      return !!val && val !== '0' && parseFloat(val) > 0;
    }
  );
  // Модель имеет pricing-информацию, если есть объект pricing или pricing_skus
  const hasPricingData = allStandardPricingEntries.length > 0 || pricingSkusEntries.length > 0;
  // Для медиа-моделей (image/video) нулевой prompt/completion НЕ означает "бесплатно" —
  // тарификация идёт per image/per video, но API /models не всегда отдаёт эту цену явно.
  const outputModalities = selectedModelData?.architecture?.output_modalities ?? [];
  const isMediaGenerationModel = outputModalities.includes('image') || outputModalities.includes('video');
  const isFreePricing = hasPricingData && nonZeroStandardEntries.length === 0 && nonZeroSkuEntries.length === 0 && !isMediaGenerationModel;


  // Polling for video generation jobs
  const polling = usePolling({
    pollFn: async (jobId: string) => {
      if (isVideoMode) {
        return await window.electronAPI.i2vPoll(jobId);
      } else {
        return await window.electronAPI.pollVideo(`https://openrouter.ai/api/v1/videos/${jobId}`);
      }
    },
    interval: 5000,
    maxAttempts: 1000,
    onStatus: (status: VideoJobStatus) => {
      setPollingStatusText(status.status.toUpperCase());
    },
    onCompleted: (status: VideoJobStatus) => {
      setActiveResultUrls(status.unsigned_urls ?? []);
      setActiveLocalPaths((status as any).localPaths ?? []);
      setGenState('completed');
      loadHistory();
      store.refreshCredits?.();
    },
    onError: (msg) => {
      setErrorMsg(msg);
      setGenState('failed');
    },
  });

  // Load models on tab or config change
  useEffect(() => {
    if (isConfigured) {
      loadModels();
      loadHistory();
    }
    return () => { polling.abort(); };
  }, [activeTab, apiKey, localFolder]);

  async function loadModels() {
    setLoadingModels(true);
    setModels([]);
    setSelectedModelId('');
    setSelectedModelData(null);
    try {
      let res;
      if (activeTab === 'text-to-image' || activeTab === 'image-to-image') {
        res = await window.electronAPI.fetchModels('image');
      } else if (activeTab === 'image-to-video') {
        res = await window.electronAPI.i2vGetModels();
      } else if (activeTab === 'text-to-video') {
        res = await window.electronAPI.fetchModels('video');
      }

      if (res?.success && res.data && res.data.length > 0) {
        setModels(res.data);

        // Пытаемся восстановить ранее выбранную модель для этого таба
        const configRes = await window.electronAPI.getConfig();
        const savedId = configRes.success ? (configRes.data as any)?.[getTabModelKey(activeTab)] : '';
        const savedModel = savedId ? res.data.find((m: OpenRouterModel) => m.id === savedId) : null;

        if (savedModel) {
          handleSelectModel(savedModel, false);
        } else if (activeTab === 'image-to-video') {
          const preferred = res.data.find((m: OpenRouterModel) => m.id.includes('alibaba/wan-2.7')) ?? res.data[0];
          handleSelectModel(preferred, false);
        } else {
          handleSelectModel(res.data[0], false);
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setLoadingModels(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await window.electronAPI.historyList();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Helper: получить ключ конфига для выбранной модели таба
  function getTabModelKey(tab: typeof activeTab): string {
    switch (tab) {
      case 'text-to-image': return 'selectedModelT2I';
      case 'image-to-image': return 'selectedModelI2I';
      case 'image-to-video': return 'selectedModelI2V';
      case 'text-to-video': return 'selectedModelT2V';
      default: return 'selectedModel';
    }
  }

  function handleSelectModel(m: OpenRouterModel, saveToStore = true) {
    setSelectedModelId(m.id);
    setSelectedModelData(m);
    
    // Сохраняем выбор модели в store Electron для этого таба
    if (saveToStore) {
      window.electronAPI.setConfig({ [getTabModelKey(activeTab)]: m.id });
    }
    
    // Автоматически предустанавливаем оптимальные значения по умолчанию при выборе модели
    const isImageMode = activeTab === 'text-to-image' || activeTab === 'image-to-image';

    const defaultRes = isImageMode 
      ? (m.supported_sizes && m.supported_sizes.length > 0 ? m.supported_sizes[0] : '1K')
      : (m.supported_resolutions && m.supported_resolutions.length > 0
        ? (m.supported_resolutions.includes('720p') ? '720p' : m.supported_resolutions[0])
        : '');
    setResolution(defaultRes);
    
    const defaultAspect = isImageMode
      ? (m.supported_aspect_ratios && m.supported_aspect_ratios.length > 0 ? m.supported_aspect_ratios[0] : '1:1')
      : (m.supported_aspect_ratios && m.supported_aspect_ratios.length > 0
        ? (m.supported_aspect_ratios.includes('16:9') ? '16:9' : m.supported_aspect_ratios[0])
        : '');
    setAspectRatio(defaultAspect);
    
    const defaultDuration = m.supported_durations && m.supported_durations.length > 0
      ? (m.supported_durations.includes(5) ? '5' : String(m.supported_durations[0]))
      : '';
    setDuration(defaultDuration);

    // Автоматически синхронизируем состояние генерации аудио
    setGenerateAudio(m.generate_audio ?? false);
  }

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
        setFirstFrameError(uploadResult.error ?? t('dashboard.frameUploadFailed'));
      }
    }
  }

  function handleClearFirstFrame() {
    setFirstFramePath(null);
    setFirstFrame(null);
    setFirstFrameError(null);
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
        setLastFrameError(uploadResult.error ?? t('dashboard.frameUploadFailed'));
      }
    }
  }

  function handleClearLastFrame() {
    setLastFramePath(null);
    setLastFrame(null);
    setLastFrameError(null);
  }

  async function handlePickRefImage() {
    const result = await window.electronAPI.openFileDialog();
    if (result.success && result.data) {
      const filePath = result.data;
      setRefImagePath(filePath);
      setRefImageLoading(true);
      setRefImageError(null);
      setRefImage(null);
      
      const uploadResult = await window.electronAPI.i2vUploadImage(filePath);
      setRefImageLoading(false);
      if (uploadResult.success && uploadResult.data) {
        setRefImage(uploadResult.data);
      } else {
        setRefImageError(uploadResult.error ?? t('dashboard.frameUploadFailed'));
      }
    }
  }

  function handleClearRefImage() {
    setRefImagePath(null);
    setRefImage(null);
    setRefImageError(null);
  }

  async function handlePickAudioRef() {
    const result = await window.electronAPI.dialogOpenAudioFile();
    if (result.success && result.data) {
      const filePath = result.data;
      setAudioRefPath(filePath);
      setAudioRefLoading(true);
      setAudioRefError(null);
      setAudioRef(null);
      
      const uploadResult = await window.electronAPI.audioUpload(filePath);
      setAudioRefLoading(false);
      if (uploadResult.success && uploadResult.data) {
        setAudioRef(uploadResult.data);
      } else {
        setAudioRefError(uploadResult.error ?? t('dashboard.audioUploadFailed'));
      }
    }
  }

  function handleClearAudioRef() {
    setAudioRefPath(null);
    setAudioRef(null);
    setAudioRefError(null);
  }

  function canGenerate(): boolean {
    if (!isConfigured) return false;
    if (!selectedModelId) return false;
    if (!prompt.trim() || prompt.trim().length < 3) return false;
    if ((activeTab === 'image-to-video' || activeTab === 'image-to-image') && !firstFrame) return false;
    if (firstFrameLoading || lastFrameLoading || refImageLoading || audioRefLoading) return false;
    if (genState === 'uploading' || genState === 'submitting' || genState === 'polling') return false;
    return true;
  }

  async function handleGenerate() {
    if (!canGenerate()) return;

    setErrorMsg(null);
    setActiveResultUrls([]);
    setActiveLocalPaths([]);
    setActiveJobId(null);
    setGenState('submitting');
    setPollingStatusText('PENDING');

    if (activeTab === 'text-to-image') {
      setActiveMediaType('image');
      try {
        // Sync API Key in Electron ConfigStore
        await window.electronAPI.setConfig({ selectedModel: selectedModelId, mediaType: 'image' });

        // Определяем модальности на основе output_modalities модели
        const outputModalities = selectedModelData?.architecture?.output_modalities ?? ['image', 'text'];
        const isImageOnly = outputModalities.length === 1 && outputModalities[0] === 'image';

        const options = {
          resolution: resolution || undefined,
          aspectRatio: aspectRatio || undefined,
          seed: seed ? Number(seed) : undefined,
          outputModalities: isImageOnly ? ['image'] : ['image', 'text'],
        };

        const res = await window.electronAPI.generateImage(prompt.trim(), undefined, options);
        if (res.success && res.data) {
          setActiveResultUrls(res.data.urls);
          setActiveLocalPaths((res.data as any).localPaths ?? []);
          setGenState('completed');
          loadHistory();
          store.refreshCredits?.();
        } else {
          setErrorMsg(res.error ?? t('dashboard.imageGenError'));
          setGenState('failed');
        }
      } catch (err) {
        setErrorMsg((err as Error).message);
        setGenState('failed');
      }
    } else if (activeTab === 'image-to-image') {
      setActiveMediaType('image');
      try {
        await window.electronAPI.setConfig({ selectedModel: selectedModelId, mediaType: 'image' });

        const outputModalities = selectedModelData?.architecture?.output_modalities ?? ['image', 'text'];
        const isImageOnly = outputModalities.length === 1 && outputModalities[0] === 'image';

        const options = {
          resolution: resolution || undefined,
          aspectRatio: aspectRatio || undefined,
          seed: seed ? Number(seed) : undefined,
          outputModalities: isImageOnly ? ['image'] : ['image', 'text'],
        };

        const res = await window.electronAPI.generateImage(prompt.trim(), firstFrame!.url, options);
        if (res.success && res.data) {
          setActiveResultUrls(res.data.urls);
          setActiveLocalPaths((res.data as any).localPaths ?? []);
          setGenState('completed');
          loadHistory();
          store.refreshCredits?.();
        } else {
          setErrorMsg(res.error ?? t('dashboard.imageGenError'));
          setGenState('failed');
        }
      } catch (err) {
        setErrorMsg((err as Error).message);
        setGenState('failed');
      }
    } else if (activeTab === 'image-to-video') {
      setActiveMediaType('video');
      try {
        await window.electronAPI.setConfig({ i2vSelectedModel: selectedModelId, mediaType: 'video' });
        const res = await window.electronAPI.i2vGenerate({
          model: selectedModelId,
          prompt: prompt.trim(),
          firstFrame: firstFrame!,
          lastFrame: lastFrame || undefined,
          refImage: refImage || undefined,
          audioRef: audioRef || undefined,
          resolution: resolution || undefined,
          aspectRatio: aspectRatio || undefined,
          duration: duration ? Number(duration) : undefined,
          generateAudio: supportsAudio ? generateAudio : undefined,
          seed: seed ? Number(seed) : undefined,
        } as any);

        if (res.success && res.data) {
          const { id } = res.data;
          setActiveJobId(id);
          setGenState('polling');
          polling.start(id);
        } else {
          setErrorMsg(res.error ?? t('dashboard.videoJobError'));
          setGenState('failed');
        }
      } catch (err) {
        setErrorMsg((err as Error).message);
        setGenState('failed');
      }
    } else if (activeTab === 'text-to-video') {
      setActiveMediaType('video');
      try {
        await window.electronAPI.setConfig({ selectedModel: selectedModelId, mediaType: 'video' });
        const res = await window.electronAPI.generateVideo({
          prompt: prompt.trim(),
          resolution: resolution || undefined,
          aspect_ratio: aspectRatio || undefined,
          duration: duration ? Number(duration) : undefined,
          generate_audio: supportsAudio ? generateAudio : undefined,
          seed: seed ? Number(seed) : undefined,
          input_references: refImage ? [{ type: 'image_url', image_url: { url: refImage.url } }] : undefined,
          audio_ref: audioRef ? audioRef.url : undefined,
        });

        if (res.success && res.data) {
          const { id } = res.data;
          setActiveJobId(id);
          setGenState('polling');
          polling.start(id);
        } else {
          setErrorMsg(res.error ?? t('dashboard.videoJobError'));
          setGenState('failed');
        }
      } catch (err) {
        setErrorMsg((err as Error).message);
        setGenState('failed');
      }
    }
  }

  async function handleCheckConfigAgain() {
    const result = await window.electronAPI.getConfig();
    if (result.success && result.data) {
      store.setApiKey(result.data.apiKey);
      store.setLocalFolder(result.data.localFolder);
      store.setImgbbApiKey(result.data.imgbbApiKey || '');
    }
  }

  async function handleDeleteHistoryItem(id: string) {
    await window.electronAPI.historyDelete(id);
    loadHistory();
  }

  async function handleRecoverPending() {
    setRecovering(true);
    try {
      await window.electronAPI.historyRecoverPending();
      await loadHistory();
    } finally {
      setRecovering(false);
    }
  }

  function getFileName(filePath: string): string {
    return filePath.split(/[\\/]/).pop() || filePath;
  }

  async function handleOpenLocalFile(filePath: string) {
    const result = await window.electronAPI.openLocalFile(filePath);
    if (!result.success) {
      console.error(result.error ?? t('dashboard.openFileFailed'));
    }
  }

  async function handleShowLocalFileInFolder(filePath: string) {
    const result = await window.electronAPI.showLocalFileInFolder(filePath);
    if (!result.success) {
      console.error(result.error ?? t('dashboard.openFolderFailed'));
    }
  }

  function handleOpenHistoryItem(item: GenerationHistoryItem) {
    setActiveResultUrls(item.remoteUrls ?? []);
    setActiveLocalPaths(item.localPaths ?? []);
    setActiveMediaType(item.mode.includes('video') ? 'video' : 'image');
    setGenState('completed');
    setShowHistoryModal(false);
  }

  // Get first 6 items for recent dashboard grid
  const recentHistory = history.slice(0, 6);
  // Complete list for empty cards rendering up to 6
  const placeholderCardsCount = Math.max(0, 6 - recentHistory.length);
  const activeLocalPath = activeLocalPaths[0];



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Top navigation tabs bar */}
      <div className="tabs-bar">
        <div className={`tab-card ${activeTab === 'text-to-image' ? 'active' : ''}`} onClick={() => setActiveTab('text-to-image')}>
          <img src={textToImgIcon} alt="" />
          {t('dashboard.textToImage')}
        </div>
        <div className={`tab-card ${activeTab === 'image-to-image' ? 'active' : ''}`} onClick={() => setActiveTab('image-to-image')}>
          <img src={imgToImgIcon} alt="" />
          {t('dashboard.imageToImage')}
        </div>
        <div className={`tab-card ${activeTab === 'text-to-video' ? 'active' : ''}`} onClick={() => setActiveTab('text-to-video')}>
          <img src={videoToVideoIcon} alt="" />
          {t('dashboard.textToVideo')}
        </div>
        <div className={`tab-card ${activeTab === 'image-to-video' ? 'active' : ''}`} onClick={() => setActiveTab('image-to-video')}>
          <img src={imgToVideoIcon} alt="" />
          {t('dashboard.imageToVideo')}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left column Settings Panel */}
        <div className="settings-panel">
          <div className="panel-title">{t('dashboard.settingsTitle')}</div>

          {/* Setup warning overlay when missing key/folder */}
          {!isConfigured && (
            <div className="setup-overlay">
              <div className="setup-card">
                <div className="setup-header">
                  <img src={gearIcon} className="setup-icon" alt="" />
                  <div className="setup-title">{t('dashboard.setupRequired')}</div>
                </div>
                <p className="setup-desc">
                  {t('dashboard.setupDesc')}
                </p>
                <div className="setup-list">
                  <div className="setup-item">
                    <span className="setup-bullet" style={{ background: apiKey ? 'var(--success)' : 'var(--accent)' }} />
                    {apiKey ? t('dashboard.apiKeySet') : t('dashboard.apiKeyNotSet')}
                  </div>
                  <div className="setup-item">
                    <span className="setup-bullet" style={{ background: localFolder ? 'var(--success)' : 'var(--accent)' }} />
                    {localFolder ? t('dashboard.folderSelected') : t('dashboard.folderNotSelected')}
                  </div>
                </div>
                <button className="btn-submit" onClick={() => store.setShowSettings(true)}>
                  {t('dashboard.openSettings')}
                </button>
                <button className="btn-secondary" onClick={handleCheckConfigAgain} style={{ marginTop: '4px' }}>
                  {t('dashboard.checkAgain')}
                </button>
              </div>
            </div>
          )}

          {/* Model Input */}
          <div className="field">
            <label>{t('dashboard.model')}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                style={{ flex: 1 }}
                value={selectedModelId}
                disabled={loadingModels}
                onChange={(e) => {
                  const m = models.find(x => x.id === e.target.value);
                  if (m) handleSelectModel(m);
                }}
              >
                {loadingModels && <option value="">{t('dashboard.loadingModels')}</option>}
                {!loadingModels && models.length === 0 && <option value="">{t('dashboard.noModels')}</option>}
                {!loadingModels && models.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
              </select>
              <button 
                className="btn-secondary" 
                onClick={loadModels} 
                disabled={loadingModels} 
                style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                title={t('dashboard.refreshModels')}
              >
                <img 
                  src={refreshIcon} 
                  alt="Refresh" 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    objectFit: 'contain', 
                    animation: loadingModels ? 'spin 1.2s linear infinite' : 'none' 
                  }} 
                />
              </button>
            </div>
            {selectedModelData && hasPricingData && (
              <div className="field-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', lineHeight: 1.4 }}>
                <b>{t('dashboard.price')}</b>
                {isFreePricing ? (
                  <span style={{ background: 'rgba(76, 175, 80, 0.12)', padding: '2px 10px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.25)', fontSize: '12px', color: '#66bb6a', fontWeight: 600 }}>
                    {t('dashboard.free')}
                  </span>
                ) : isMediaGenerationModel && nonZeroStandardEntries.length === 0 && nonZeroSkuEntries.length === 0 ? (
                  <span style={{ background: 'rgba(255, 152, 0, 0.12)', padding: '2px 10px', borderRadius: '6px', border: '1px solid rgba(255, 152, 0, 0.25)', fontSize: '12px', color: '#ffa726', fontWeight: 600 }}>
                    {t('dashboard.priceNotSpecified')}
                  </span>
                ) : nonZeroSkuEntries.length > 0 ? (
                  nonZeroSkuEntries.map(([key, val]) => (
                    <span key={key} style={{ background: 'rgba(224, 86, 22, 0.08)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(224, 86, 22, 0.15)', fontSize: '12px' }}>
                      {formatPricingSku(key, val, t)}
                    </span>
                  ))
                ) : (
                  nonZeroStandardEntries.map(([key, val]) => (
                    <span key={key} style={{ background: 'rgba(224, 86, 22, 0.08)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(224, 86, 22, 0.15)', fontSize: '12px' }}>
                      {formatPricingSku(key, val, t)}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="field">
            <label>{t('dashboard.prompt')}</label>
            <textarea
              placeholder={t('dashboard.promptPlaceholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={3000}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '4px' }}>
              {prompt.length} / 3000
            </div>
          </div>

          {/* Параметры генерации: 1 строка - 1 поле */}
          <div className="parameter-rows-container">
            {/* Разрешение */}
            <div className="parameter-row" style={{ zIndex: 30 }}>
              <div className="parameter-label-group">
                <img src={dimIcon} className="param-img-icon" alt="" />
                <label className="param-text-label">{t('dashboard.resolution')}</label>
              </div>
              <div className="parameter-control-field">
                <CustomSelect 
                  options={resolutions} 
                  value={resolution} 
                  onChange={setResolution} 
                />
              </div>
            </div>

            {/* Соотношение сторон */}
            <div className="parameter-row" style={{ zIndex: 25 }}>
              <div className="parameter-label-group">
                <img src={ratioIcon} className="param-img-icon" alt="" />
                <label className="param-text-label">{t('dashboard.aspectRatio')}</label>
              </div>
              <div className="parameter-control-field">
                <CustomSelect 
                  options={aspectRatios} 
                  value={aspectRatio} 
                  onChange={setAspectRatio} 
                  renderOption={renderAspectRatioOption}
                />
              </div>
            </div>

            {/* Длительность (только в видео-режимах) */}
            {isVideoMode && (
              <div className="parameter-row" style={{ zIndex: 20 }}>
                <div className="parameter-label-group">
                  <img src={clockIcon} className="param-img-icon" alt="" />
                  <label className="param-text-label">{t('dashboard.duration')}</label>
                </div>
                <div className="parameter-control-field">
                  {durations.length > 0 ? (
                    <CustomSelect 
                      options={durations.map(String)} 
                      value={duration} 
                      onChange={setDuration} 
                      renderOption={(d) => `${d} ${t('dashboard.seconds')}`}
                    />
                  ) : (
                    <input type="number" placeholder={`5 ${t('dashboard.seconds')}`} value={duration} onChange={(e) => setDuration(e.target.value)} />
                  )}
                </div>
              </div>
            )}

            {/* Аудио (только если модель поддерживает генерацию аудио с возможностью переключения) */}
            {supportsAudio && (
              <div className="parameter-row">
                <div className="parameter-label-group">
                  <img src={audioIcon} className="param-img-icon" alt="" />
                  <label className="param-text-label" onClick={() => setGenerateAudio(!generateAudio)}>{t('dashboard.audio')}</label>
                </div>
                <div className="parameter-control-field" style={{ justifyContent: 'flex-start' }}>
                  <svg 
                    className={`custom-checkbox-svg ${generateAudio ? 'active' : ''}`}
                    viewBox="0 0 44 44" 
                    onClick={() => setGenerateAudio(!generateAudio)}
                  >
                    <defs>
                      <filter id="orange-glow-active" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <rect x="4" y="4" width="36" height="36" />
                    <path d="M12 22 L20 29 L32 14" />
                  </svg>
                </div>
              </div>
            )}

            {/* Seed */}
            <div className="parameter-row">
              <div className="parameter-label-group">
                <img src={seedIcon} className="param-img-icon" alt="" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="param-text-label">Seed</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{t('dashboard.seedOptional')}</span>
                  <div className="tooltip-wrapper">
                    <span className="tooltip-trigger">ℹ</span>
                    <div className="tooltip-content">
                      <div dangerouslySetInnerHTML={{ __html: t('dashboard.seedTooltipTitle') }} />
                      <br /><br />
                      <div dangerouslySetInnerHTML={{ __html: t('dashboard.seedTooltipBody1') }} />
                      <br />
                      <div dangerouslySetInnerHTML={{ __html: t('dashboard.seedTooltipBody2') }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="parameter-control-field">
                <input type="number" placeholder={t('dashboard.seedRandom')} value={seed} onChange={(e) => setSeed(e.target.value)} />
              </div>
            </div>
          </div>

          {/* First Frame dropzone upload - only in Image-to-Video or Image-to-Image */}
          {(activeTab === 'image-to-video' || activeTab === 'image-to-image') && (
            <div className="field">
              <label>{activeTab === 'image-to-video' ? t('dashboard.firstFrameRequired') : t('dashboard.sourceImageRequired')}</label>
              {firstFrameLoading ? (
                <div className="dropzone">
                  <span className="spinner" />
                  <div className="dropzone-title">{t('dashboard.loadingImage')}</div>
                </div>
              ) : firstFrame ? (
                <div className="uploaded-frame-card">
                  <img src={firstFrame.url} className="thumb" alt="" />
                  <div className="uploaded-frame-info">
                    <div className="uploaded-frame-title">{t('dashboard.uploadedSuccessfully')}</div>
                    <div className="uploaded-frame-name">{firstFrame.originalFileName}</div>
                  </div>
                  <button className="btn-secondary" onClick={handleClearFirstFrame} style={{ padding: '4px 10px', fontSize: '11px' }}>
                    {t('dashboard.delete')}
                  </button>
                </div>
              ) : (
                <div className="dropzone" onClick={handlePickFirstFrame}>
                  <img src={uploadIcon} className="dropzone-icon" alt="" />
                  <div className="dropzone-title">
                    {activeTab === 'image-to-video' ? t('dashboard.uploadFirstFrame') : t('dashboard.uploadSourceImage')}
                  </div>
                  <div className="dropzone-sub">PNG, JPG до 10MB</div>
                </div>
              )}
              {firstFrameError && <div className="error-msg" style={{ marginTop: '6px' }}>{firstFrameError}</div>}
            </div>
          )}

          {/* End Frame dropzone upload - only in Image-to-Video if supported */}
          {supportsEndFrame && (
            <div className="field">
              <label>{t('dashboard.endFrameOptional')}</label>
              {lastFrameLoading ? (
                <div className="dropzone">
                  <span className="spinner" />
                  <div className="dropzone-title">{t('dashboard.loadingImage')}</div>
                </div>
              ) : lastFrame ? (
                <div className="uploaded-frame-card">
                  <img src={lastFrame.url} className="thumb" alt="" />
                  <div className="uploaded-frame-info">
                    <div className="uploaded-frame-title">{t('dashboard.uploadedSuccessfully')}</div>
                    <div className="uploaded-frame-name">{lastFrame.originalFileName}</div>
                  </div>
                  <button className="btn-secondary" onClick={handleClearLastFrame} style={{ padding: '4px 10px', fontSize: '11px' }}>
                    {t('dashboard.delete')}
                  </button>
                </div>
              ) : (
                <div className="dropzone" onClick={handlePickLastFrame}>
                  <img src={uploadIcon} className="dropzone-icon" alt="" />
                  <div className="dropzone-title">
                    {t('dashboard.uploadEndFrame')}
                  </div>
                  <div className="dropzone-sub">PNG, JPG до 10MB</div>
                </div>
              )}
              {lastFrameError && <div className="error-msg" style={{ marginTop: '6px' }}>{lastFrameError}</div>}
            </div>
          )}

          {/* Reference Image dropzone upload - if supported */}
          {supportsRefImage && (
            <div className="field">
              <label>{t('dashboard.refImageOptional')}</label>
              {refImageLoading ? (
                <div className="dropzone">
                  <span className="spinner" />
                  <div className="dropzone-title">{t('dashboard.loadingImage')}</div>
                </div>
              ) : refImage ? (
                <div className="uploaded-frame-card">
                  <img src={refImage.url} className="thumb" alt="" />
                  <div className="uploaded-frame-info">
                    <div className="uploaded-frame-title">{t('dashboard.uploadedSuccessfully')}</div>
                    <div className="uploaded-frame-name">{refImage.originalFileName}</div>
                  </div>
                  <button className="btn-secondary" onClick={handleClearRefImage} style={{ padding: '4px 10px', fontSize: '11px' }}>
                    {t('dashboard.delete')}
                  </button>
                </div>
              ) : (
                <div className="dropzone" onClick={handlePickRefImage}>
                  <img src={uploadIcon} className="dropzone-icon" alt="" />
                  <div className="dropzone-title">
                    {t('dashboard.uploadRefImage')}
                  </div>
                  <div className="dropzone-sub">PNG, JPG до 10MB</div>
                </div>
              )}
              {refImageError && <div className="error-msg" style={{ marginTop: '6px' }}>{refImageError}</div>}
            </div>
          )}

          {/* Reference Audio dropzone upload - if supported */}
          {supportsAudioRef && (
            <div className="field">
              <label>{t('dashboard.audioRefOptional')}</label>
              {audioRefLoading ? (
                <div className="dropzone">
                  <span className="spinner" />
                  <div className="dropzone-title">{t('dashboard.loadingAudio')}</div>
                </div>
              ) : audioRef ? (
                <div className="uploaded-frame-card">
                  <div className="uploaded-frame-info" style={{ marginLeft: 0 }}>
                    <div className="uploaded-frame-title" style={{ color: 'var(--accent)' }}>🎵 {t('dashboard.audioUploadedSuccessfully')}</div>
                    <div className="uploaded-frame-name" style={{ fontSize: '12px', opacity: 0.95 }}>{audioRef.originalFileName}</div>
                    <div className="uploaded-frame-size" style={{ fontSize: '11px', opacity: 0.6 }}>{(audioRef.sizeBytes / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button className="btn-secondary" onClick={handleClearAudioRef} style={{ padding: '4px 10px', fontSize: '11px', marginLeft: 'auto' }}>
                    {t('dashboard.delete')}
                  </button>
                </div>
              ) : (
                <div className="dropzone" onClick={handlePickAudioRef}>
                  <img src={uploadIcon} className="dropzone-icon" alt="" />
                  <div className="dropzone-title">
                    {t('dashboard.uploadAudioRef')}
                  </div>
                  <div className="dropzone-sub">MP3, WAV до 30MB</div>
                </div>
              )}
              {audioRefError && <div className="error-msg" style={{ marginTop: '6px' }}>{audioRefError}</div>}
            </div>
          )}


          {/* Submit Action Button */}
          <button
            className="btn-submit"
            onClick={handleGenerate}
            disabled={!canGenerate()}
            style={{ marginTop: 'auto', paddingTop: '14px', paddingBottom: '14px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeTab === 'text-to-image' && (
                <>
                  <img src={imageIcon} style={{ width: '18px', height: '18px', objectFit: 'contain' }} alt="" />
                  {t('dashboard.generateImage')}
                </>
              )}
              {activeTab === 'image-to-image' && (
                <>
                  <img src={imageIcon} style={{ width: '18px', height: '18px', objectFit: 'contain' }} alt="" />
                  {t('dashboard.generateImage')}
                </>
              )}
              {activeTab === 'image-to-video' && (
                <>
                  <span className="submit-play-icon">▶</span>
                  {t('dashboard.generateVideo')}
                </>
              )}
              {activeTab === 'text-to-video' && (
                <>
                  <span className="submit-play-icon">▶</span>
                  {t('dashboard.generateVideo')}
                </>
              )}
            </span>
          </button>
        </div>

        {/* Right column Preview and Recent History */}
        <div className="preview-container">
          {/* Viewport block */}
          <div className="preview-box">
            <div className="preview-title">{t('dashboard.preview')}</div>

            <div className="preview-viewport">
              {/* Idle status */}
              {genState === 'idle' && (
                <div className="preview-placeholder">
                  <img src={catBigLogo} className="preview-cat-icon" alt="" />
                  <div className="preview-status">
                    {isVideoMode ? t('dashboard.videoPlaceholder') : t('dashboard.imagePlaceholder')}
                  </div>
                  <p className="preview-subtext">
                    {t('dashboard.placeholderSubtext')}
                  </p>
                </div>
              )}

              {/* Offline warning overlay */}
              {!isConfigured && genState === 'idle' && (
                <div className="preview-placeholder">
                  <img src={catBigLogo} className="preview-cat-icon" style={{ opacity: 0.2 }} alt="" />
                  <div className="preview-status" style={{ color: 'var(--text-secondary)' }}>
                    {t('dashboard.generationUnavailable')}
                  </div>
                  <p className="preview-subtext">
                    {t('dashboard.setupNeededOverlay')}
                  </p>
                </div>
              )}

              {/* Running job progress */}
              {(genState === 'submitting' || genState === 'uploading' || genState === 'polling') && (
                <div className="preview-placeholder" style={{ gap: '12px' }}>
                  <span className="spinner" />
                  <div className="preview-status" style={{ fontSize: '14px' }}>
                    {genState === 'polling' ? `${t('dashboard.generatingMedia')}${pollingStatusText}` : t('dashboard.submittingRequest')}
                  </div>
                  {genState === 'polling' && (
                    <div className="progress-bar" style={{ width: '200px' }}>
                      <div className="fill" style={{ width: '100%' }} />
                    </div>
                  )}
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('dashboard.mayTakeMinutes')}</p>
                </div>
              )}

              {/* Error state */}
              {genState === 'failed' && errorMsg && (
                <div className="preview-placeholder">
                  <div className="error-msg" style={{ maxWidth: '380px' }}>⚠️ {errorMsg}</div>
                  <button className="btn-secondary" onClick={() => setGenState('idle')} style={{ marginTop: '10px' }}>
                    {t('dashboard.resetError')}
                  </button>
                </div>
              )}

              {/* Success playback */}
              {genState === 'completed' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {activeMediaType === 'video' && activeResultUrls.length > 0 && (
                    <video
                      src={`media-proxy://video?url=${encodeURIComponent(activeLocalPaths[0] || activeResultUrls[0])}`}
                      controls
                      autoPlay
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                    />
                  )}
                  {activeMediaType === 'image' && activeResultUrls.length > 0 && (
                    <img
                      src={`media-proxy://image?url=${encodeURIComponent(activeLocalPaths[0] || activeResultUrls[0])}`}
                      alt="Generated"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                    />
                  )}
                </div>
              )}
            </div>

            {genState === 'completed' && activeLocalPath && (
              <div className="local-file-banner">
                <span className="local-file-check">✓</span>
                <span className="local-file-name" title={activeLocalPath}>
                  {t('dashboard.fileDownloadedLocally')}<b>{getFileName(activeLocalPath)}</b>
                </span>
                <div className="local-file-actions">
                  <button className="local-file-action" onClick={() => handleOpenLocalFile(activeLocalPath)} title={t('dashboard.openFileFailed')}>
                    <img src={viewIcon} alt="" />
                    {t('dashboard.localPlayer')}
                  </button>
                  <button className="local-file-action" onClick={() => handleShowLocalFileInFolder(activeLocalPath)} title={t('dashboard.openFolderFailed')}>
                    <img src={folderIcon} alt="" />
                    {t('dashboard.localFolder')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent History row block */}
          <div className="history-box">
            <div className="history-header">
              <div className="history-title">{t('dashboard.recentHistory')}</div>
              <button className="btn-secondary" onClick={() => setShowHistoryModal(true)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={historyEmptyIcon} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                {t('dashboard.openHistory')}
              </button>
            </div>

            {history.length === 0 ? (
              <div className="history-empty-state">
                <img src={historyEmptyIcon} alt="" className="history-empty-icon" />
                <div className="history-empty-text">{t('dashboard.historyEmpty')}</div>
                <p className="history-empty-sub">
                  {t('dashboard.historyEmptySub')}
                </p>
              </div>
            ) : (
              <div className="history-grid">
                {recentHistory.map((item) => {
                  const isImageItem = item.mode === 'text-to-image' || item.mode === 'image-to-image';
                  const thumbnailSrc = item.localPaths?.[0] || item.remoteUrls?.[0];

                  return (
                    <div key={item.id} className="history-card" onClick={() => handleOpenHistoryItem(item)}>
                      {thumbnailSrc ? (
                        isImageItem ? (
                          <img
                            src={`media-proxy://image?url=${encodeURIComponent(thumbnailSrc)}`}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = previewUnavailableIcon;
                              (e.target as HTMLImageElement).style.objectFit = 'contain';
                              (e.target as HTMLImageElement).style.padding = '8px';
                              (e.target as HTMLImageElement).style.opacity = '0.5';
                            }}
                          />
                        ) : (
                          <video
                            src={`media-proxy://video?url=${encodeURIComponent(thumbnailSrc)}`}
                            preload="metadata"
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={(e) => {
                              const el = e.currentTarget as HTMLVideoElement;
                              el.poster = previewUnavailableIcon;
                              el.style.objectFit = 'contain';
                              el.style.padding = '8px';
                              el.style.opacity = '0.5';
                            }}
                          />
                        )
                      ) : (
                        <div className="history-card-placeholder">
                          <img
                            src={previewUnavailableIcon}
                            alt="No preview"
                            style={{ width: '28px', height: '28px', objectFit: 'contain', opacity: 0.35 }}
                          />
                        </div>
                      )}
                      {!isImageItem && (
                        <>
                          <div className="history-play-icon">▶</div>
                          {item.duration && <div className="history-duration">0:{item.duration < 10 ? `0${item.duration}` : item.duration}</div>}
                        </>
                      )}
                    </div>
                  );
                })}

                {Array.from({ length: placeholderCardsCount }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="history-card" style={{ cursor: 'default' }}>
                    <div className="history-card-placeholder">
                      <img src={imgToVideoIcon} alt="" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="history-subtext">
              {t('dashboard.historyLocalNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Подвал приложения */}
      <footer style={{
        padding: '10px 24px',
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        opacity: 0.5,
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        letterSpacing: '0.5px',
        marginTop: 'auto',
        background: 'rgba(0, 0, 0, 0.1)'
      }}>
        <span>Koteyye Media Studio v1.0.2</span>
      </footer>

      {/* Unified Full History Modal Popup */}
      {showHistoryModal && (
        <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('dashboard.fullHistory')}</h3>
              <button className="btn-secondary" onClick={() => setShowHistoryModal(false)} style={{ padding: '6px 12px' }}>
                {t('dashboard.close')}
              </button>
            </div>

            <div className="history-modal-content">
              {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {t('dashboard.historyEmptyModal')}
                </div>
              )}

              {/* Кнопка восстановления pending-задач */}
              {history.some(item => ['pending', 'in_progress', 'queued', 'running', 'processing'].includes(item.status)) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 16px', marginBottom: '12px',
                  background: 'rgba(224, 86, 22, 0.08)', border: '1px solid rgba(224, 86, 22, 0.2)',
                  borderRadius: '8px', fontSize: '13px'
                }}>
                  <span style={{ flex: 1, color: 'var(--accent)' }}>
                    {t('dashboard.pendingTasksAlert')}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={handleRecoverPending}
                    disabled={recovering}
                    style={{ borderColor: 'var(--accent)', padding: '6px 14px', whiteSpace: 'nowrap' }}
                  >
                    {recovering ? t('dashboard.recovering') : t('dashboard.recover')}
                  </button>
                </div>
              )}

              {history.map((item) => {
                const isPending = ['pending', 'in_progress', 'queued', 'running', 'processing'].includes(item.status);
                return (
                  <div key={item.id} className="history-list-item">
                    <div className="history-list-left">
                      <div className="history-list-model">{item.model}</div>
                      <div className="history-list-prompt">{item.prompt}</div>
                      <div className="history-list-meta">
                        {t('dashboard.mode')} <b>{item.mode}</b> | {t('dashboard.status')} <b style={isPending ? { color: 'var(--accent)' } : undefined}>{item.status}</b> | {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="history-list-actions">
                      {item.remoteUrls?.length > 0 && (
                        <button className="btn-secondary" onClick={() => handleOpenHistoryItem(item)} style={{ borderColor: 'var(--accent)' }}>
                          {t('dashboard.open')}
                        </button>
                      )}
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.7,
                          transition: 'opacity 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        title={t('dashboard.deleteHistory')}
                      >
                        <img src={deleteIcon} alt={t('dashboard.deleteHistory')} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
