import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserResponse,
  AIConfig,
  DashboardResponse,
  LessonResponseDTO,
  CompetenceResponse,
  TimelineEntry
} from '@/lib/types';
import { type Locale, detectLocale } from '@/i18n';

interface AppState {
  // Auth
  token: string | null;
  setToken: (token: string | null) => void;

  // User state
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;

  // AI config
  aiConfig: AIConfig | null;
  setAIConfig: (config: AIConfig | null) => void;

  // Locale
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Voice preference
  selectedVoice: string | null;
  setSelectedVoice: (voice: string | null) => void;

  // Dashboard data
  dashboard: DashboardResponse | null;
  setDashboard: (dashboard: DashboardResponse | null) => void;

  // Lessons
  lessons: LessonResponseDTO[];
  setLessons: (lessons: LessonResponseDTO[]) => void;
  currentLesson: LessonResponseDTO | null;
  setCurrentLesson: (lesson: LessonResponseDTO | null) => void;

  // Mastery
  competences: CompetenceResponse[];
  setCompetences: (competences: CompetenceResponse[]) => void;

  // Timeline
  timeline: TimelineEntry[];
  setTimeline: (timeline: TimelineEntry[]) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  token: null,
  user: null,
  aiConfig: null,
  locale: detectLocale(),
  selectedVoice: null,
  dashboard: null,
  lessons: [],
  currentLesson: null,
  competences: [],
  timeline: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setAIConfig: (aiConfig) => set({ aiConfig }),
      setLocale: (locale) => set({ locale }),
      setSelectedVoice: (selectedVoice) => set({ selectedVoice }),
      setDashboard: (dashboard) => set({ dashboard }),
      setLessons: (lessons) => set({ lessons }),
      setCurrentLesson: (currentLesson) => set({ currentLesson }),
      setCompetences: (competences) => set({ competences }),
      setTimeline: (timeline) => set({ timeline }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'linguist-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        aiConfig: state.aiConfig,
        locale: state.locale,
        selectedVoice: state.selectedVoice,
      }),
    }
  )
);
