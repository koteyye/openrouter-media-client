import { create } from 'zustand';
import type { OpenRouterModel, MediaType } from '../../shared/ipc-types';

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

  loading: boolean;
  error: string | null;

  setStep: (step: AppStep) => void;
  setApiKey: (key: string) => void;
  setGenerationMode: (mode: 'text' | 'i2v') => void;
  setMediaType: (mediaType: MediaType) => void;
  setSelectedModel: (model: string, modelData?: OpenRouterModel) => void;
  setModels: (models: OpenRouterModel[]) => void;
  setI2vModels: (models: OpenRouterModel[]) => void;
  setI2vSelectedModel: (model: string, modelData?: OpenRouterModel) => void;
  setImgbbApiKey: (key: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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

  loading: false,
  error: null,

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
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      step: 'config', apiKey: '', generationMode: '', mediaType: '', selectedModel: '', selectedModelData: null,
      models: [], i2vModels: [], i2vSelectedModel: '', i2vSelectedModelData: null, imgbbApiKey: '', loading: false, error: null,
    }),
}));
