import { create } from 'zustand';
import type { OpenRouterModel, MediaType } from '../../shared/ipc-types';
import type { Lang } from './i18n/translations';

export type AppStep = 'config' | 'mode' | 'mediatype' | 'model' | 'generate';

interface AppState {
  step: AppStep;
  apiKey: string;
  generationMode: 'text' | 'i2v' | '';
  mediaType: MediaType | '';
  selectedModel: string;
  selectedModelData: OpenRouterModel | null;
  models: OpenRouterModel[];

  i2vModels: OpenRouterModel[];
  i2vSelectedModel: string;
  i2vSelectedModelData: OpenRouterModel | null;
  
  imgbbApiKey: string;
  localFolder: string;

  loading: boolean;
  error: string | null;

  activeTab: 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video';
  showSettings: boolean;

  credits: number | null;
  refreshCredits: (() => void) | null;

  lang: Lang;
  setLang: (lang: Lang) => void;

  setStep: (step: AppStep) => void;
  setApiKey: (key: string) => void;
  setGenerationMode: (mode: 'text' | 'i2v') => void;
  setMediaType: (mediaType: MediaType) => void;
  setSelectedModel: (model: string, modelData?: OpenRouterModel) => void;
  setModels: (models: OpenRouterModel[]) => void;
  setI2vModels: (models: OpenRouterModel[]) => void;
  setI2vSelectedModel: (model: string, modelData?: OpenRouterModel) => void;
  setImgbbApiKey: (key: string) => void;
  setLocalFolder: (folder: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video') => void;
  setShowSettings: (show: boolean) => void;
  setCredits: (credits: number | null) => void;
  setRefreshCredits: (fn: (() => void) | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: 'config',
  apiKey: '',
  generationMode: '',
  mediaType: '',
  selectedModel: '',
  selectedModelData: null,
  models: [],

  i2vModels: [],
  i2vSelectedModel: '',
  i2vSelectedModelData: null,
  
  imgbbApiKey: '',
  localFolder: '',

  loading: false,
  error: null,

  activeTab: 'image-to-video',
  showSettings: false,
  credits: null,
  refreshCredits: null,

  lang: 'ru',
  setLang: (lang) => set({ lang }),

  setStep: (step) => set({ step }),
  setApiKey: (apiKey) => set({ apiKey }),
  setGenerationMode: (generationMode) => set({ generationMode }),
  setMediaType: (mediaType) => set({ mediaType, models: [], selectedModel: '', selectedModelData: null }),
  setSelectedModel: (selectedModel, selectedModelData) =>
    set({ selectedModel, selectedModelData: selectedModelData ?? null }),
  setModels: (models) => set({ models }),
  setI2vModels: (i2vModels) => set({ i2vModels }),
  setI2vSelectedModel: (i2vSelectedModel, i2vSelectedModelData) =>
    set({ i2vSelectedModel, i2vSelectedModelData: i2vSelectedModelData ?? null }),
  setImgbbApiKey: (imgbbApiKey) => set({ imgbbApiKey }),
  setLocalFolder: (localFolder) => set({ localFolder }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setCredits: (credits) => set({ credits }),
  setRefreshCredits: (refreshCredits) => set({ refreshCredits }),
  reset: () =>
    set({
      step: 'config', apiKey: '', generationMode: '', mediaType: '', selectedModel: '', selectedModelData: null,
      models: [], i2vModels: [], i2vSelectedModel: '', i2vSelectedModelData: null, imgbbApiKey: '', localFolder: '', loading: false, error: null,
      activeTab: 'image-to-video', showSettings: false, credits: null, lang: 'ru',
    }),
}));
