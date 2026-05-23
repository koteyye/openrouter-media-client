import { create } from 'zustand';
import type { OpenRouterModel, MediaType } from '../../shared/ipc-types';

type AppStep = 'config' | 'mediatype' | 'model' | 'generate';

interface AppState {
  step: AppStep;
  apiKey: string;
  mediaType: MediaType | '';
  selectedModel: string;
  selectedModelData: OpenRouterModel | null;
  models: OpenRouterModel[];
  loading: boolean;
  error: string | null;

  setStep: (step: AppStep) => void;
  setApiKey: (key: string) => void;
  setMediaType: (mediaType: MediaType) => void;
  setSelectedModel: (model: string, modelData?: OpenRouterModel) => void;
  setModels: (models: OpenRouterModel[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: 'config',
  apiKey: '',
  mediaType: '',
  selectedModel: '',
  selectedModelData: null,
  models: [],
  loading: false,
  error: null,

  setStep: (step) => set({ step }),
  setApiKey: (apiKey) => set({ apiKey }),
  setMediaType: (mediaType) => set({ mediaType, models: [], selectedModel: '', selectedModelData: null }),
  setSelectedModel: (selectedModel, selectedModelData) => set({ selectedModel, selectedModelData: selectedModelData ?? null }),
  setModels: (models) => set({ models }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ step: 'config', apiKey: '', mediaType: '', selectedModel: '', selectedModelData: null, models: [], loading: false, error: null }),
}));
