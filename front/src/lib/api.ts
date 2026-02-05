import {
  AIConfig,
  AuthResponse,
  CreateUserRequest,
  LoginRequest,
  UpdateUserRequest,
  UserResponse,
  LessonRequestDTO,
  LessonResponseDTO,
  SpeechAnalysisRequest,
  SpeechAnalysisResponse,
  ExplainWordRequest,
  ExplainWordResponse,
  CompetenceResponse,
  RecordPracticeRequest,
  DashboardResponse,
  TimelineEntry,
  LevelCheckResponse,
  ErrorResponse,
  PracticeSessionResponseDTO,
  ExercisesResponse,
  SubmitExercisesResponse,
  RelatedLessonDTO,
  GenerateChallengeRequest,
  SubmitWritingRequest,
  SubmitListeningRequest,
  ChallengeResponseDTO,
  PageResponse,
  VocabularyResponse,
  VocabularyStatsResponse,
} from './types';
import { useAppStore } from './store';

export const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8080/api';

export const aiApi = {
  chat: async (message: string, userId: string): Promise<{ response: string }> => {
    const aiConfig = getAIConfig();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${useAppStore.getState().token}`
    };

    if (aiConfig) {
      headers['X-AI-Provider'] = aiConfig.provider;
      headers['X-AI-Key'] = aiConfig.apiKey;
    }

    const response = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, userId }),
    });
    return handleResponse<{ response: string }>(response);
  },
};

// Helper to get AI config
export function getAIConfig(): AIConfig | null {
  const state = useAppStore.getState();
  if (state.aiConfig && state.aiConfig.apiKey) {
    return state.aiConfig;
  }
  return null;
}

// Error handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Handle 401 - redirect to login
    if (response.status === 401 || response.status === 403) {
      useAppStore.getState().reset();
      window.location.href = '/';
    }

    const errorData: ErrorResponse = await response.json().catch(() => ({
      status: response.status,
      error: response.statusText,
      message: 'Erro inesperado ao conectar com o servidor',
      details: null,
      timestamp: new Date().toISOString(),
    }));

    // Create a more user-friendly error with the message from backend
    const error = new Error(errorData.message) as Error & {
      status: number;
      details: string[] | null;
      code: string;
    };
    error.status = errorData.status;
    error.details = errorData.details;
    error.code = errorData.error;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Request helper with JWT + optional AI headers
function getHeaders(includeAI: boolean = false): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add JWT token
  const token = useAppStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeAI) {
    const aiConfig = getAIConfig();
    if (aiConfig) {
      headers['X-AI-Provider'] = aiConfig.provider;
      headers['X-AI-Key'] = aiConfig.apiKey;
    }
  }

  return headers;
}

// Public headers (no JWT needed)
function getPublicHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

// User API
export const userApi = {
  create: async (data: CreateUserRequest): Promise<AuthResponse> => {
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: getPublicHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  getById: async (id: string): Promise<UserResponse> => {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<UserResponse>(response);
  },

  getAll: async (): Promise<UserResponse[]> => {
    const response = await fetch(`${BASE_URL}/users`, {
      headers: getHeaders(),
    });
    return handleResponse<UserResponse[]>(response);
  },

  update: async (id: string, data: UpdateUserRequest): Promise<UserResponse> => {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<UserResponse>(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: getPublicHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },
};

// Lesson API
export const lessonApi = {
  generate: async (data: LessonRequestDTO): Promise<LessonResponseDTO> => {
    const response = await fetch(`${BASE_URL}/lessons/generate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<LessonResponseDTO>(response);
  },

  getByUser: async (userId: string, page = 0, size = 10): Promise<PageResponse<LessonResponseDTO>> => {
    const response = await fetch(`${BASE_URL}/lessons/user/${userId}?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<LessonResponseDTO>>(response);
  },

  getById: async (id: string): Promise<LessonResponseDTO> => {
    const response = await fetch(`${BASE_URL}/lessons/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<LessonResponseDTO>(response);
  },

  analyzeSpeech: async (formData: FormData): Promise<SpeechAnalysisResponse> => {
    const aiConfig = getAIConfig();
    const headers: Record<string, string> = {};
    
    const token = useAppStore.getState().token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (aiConfig) {
      headers['X-AI-Provider'] = aiConfig.provider;
      headers['X-AI-Key'] = aiConfig.apiKey;
    }

    const response = await fetch(`${BASE_URL}/lessons/analyze-speech`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return handleResponse<SpeechAnalysisResponse>(response);
  },

  deleteSession: async (sessionId: string, userId: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/lessons/sessions/${sessionId}?userId=${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getHistory: async (lessonId: string, page: number = 0, size: number = 5): Promise<PageResponse<PracticeSessionResponseDTO>> => {
    const response = await fetch(`${BASE_URL}/lessons/${lessonId}/sessions?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<PracticeSessionResponseDTO>>(response);
  },

  explainWord: async (data: ExplainWordRequest): Promise<ExplainWordResponse> => {
    const response = await fetch(`${BASE_URL}/lessons/explain-word`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<ExplainWordResponse>(response);
  },
};

// Mastery API
export const masteryApi = {
  getByUser: async (userId: string, page = 0, size = 20): Promise<PageResponse<CompetenceResponse>> => {
    const response = await fetch(`${BASE_URL}/mastery/user/${userId}?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<CompetenceResponse>>(response);
  },

  getWeaknesses: async (userId: string, threshold = 60, page = 0, size = 20): Promise<PageResponse<CompetenceResponse>> => {
    const response = await fetch(`${BASE_URL}/mastery/user/${userId}/weaknesses?threshold=${threshold}&page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<CompetenceResponse>>(response);
  },

  recordPractice: async (data: RecordPracticeRequest): Promise<CompetenceResponse> => {
    const response = await fetch(`${BASE_URL}/mastery/record`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<CompetenceResponse>(response);
  },

  generateExercises: async (competenceId: string): Promise<ExercisesResponse> => {
    const response = await fetch(`${BASE_URL}/mastery/${competenceId}/exercises`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse<ExercisesResponse>(response);
  },

  submitExercises: async (competenceId: string, correctCount: number, totalCount: number): Promise<SubmitExercisesResponse> => {
    const response = await fetch(`${BASE_URL}/mastery/${competenceId}/submit-exercises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ correctCount, totalCount }),
    });
    return handleResponse<SubmitExercisesResponse>(response);
  },

  getRelatedLessons: async (competenceId: string, page = 0, size = 10): Promise<PageResponse<RelatedLessonDTO>> => {
    const response = await fetch(`${BASE_URL}/mastery/${competenceId}/lessons?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<RelatedLessonDTO>>(response);
  },

  getDueReviews: async (userId: string, page = 0, size = 10): Promise<PageResponse<CompetenceResponse>> => {
    const response = await fetch(`${BASE_URL}/mastery/user/${userId}/due-reviews?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<CompetenceResponse>>(response);
  },
};

// Progress API
export const progressApi = {
  getDashboard: async (userId: string): Promise<DashboardResponse> => {
    const response = await fetch(`${BASE_URL}/progress/user/${userId}/dashboard`, {
      headers: getHeaders(),
    });
    return handleResponse<DashboardResponse>(response);
  },

  getTimeline: async (userId: string, days = 30, page = 0, size = 10): Promise<PageResponse<TimelineEntry>> => {
    const response = await fetch(`${BASE_URL}/progress/user/${userId}/timeline?days=${days}&page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<TimelineEntry>>(response);
  },

  checkLevel: async (userId: string): Promise<LevelCheckResponse> => {
    const response = await fetch(`${BASE_URL}/progress/user/${userId}/check-level`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<LevelCheckResponse>(response);
  },
};

// Challenge API
export const challengeApi = {
  getById: async (id: string): Promise<ChallengeResponseDTO> => {
    const response = await fetch(`${BASE_URL}/challenges/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<ChallengeResponseDTO>(response);
  },

  generateWriting: async (data: GenerateChallengeRequest): Promise<ChallengeResponseDTO> => {
    const response = await fetch(`${BASE_URL}/challenges/writing/generate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<ChallengeResponseDTO>(response);
  },

  submitWriting: async (data: SubmitWritingRequest): Promise<ChallengeResponseDTO> => {
    const response = await fetch(`${BASE_URL}/challenges/writing/submit`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<ChallengeResponseDTO>(response);
  },

  generateListening: async (data: GenerateChallengeRequest): Promise<ChallengeResponseDTO> => {
    const response = await fetch(`${BASE_URL}/challenges/listening/generate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<ChallengeResponseDTO>(response);
  },

  submitListening: async (data: SubmitListeningRequest): Promise<ChallengeResponseDTO> => {
    const response = await fetch(`${BASE_URL}/challenges/listening/submit`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse<ChallengeResponseDTO>(response);
  },

  getWritingPending: async (userId: string): Promise<ChallengeResponseDTO | null> => {
    const response = await fetch(`${BASE_URL}/challenges/writing/user/${userId}/pending`, {
      headers: getHeaders(),
    });
    if (response.status === 204) return null;
    return handleResponse<ChallengeResponseDTO>(response);
  },

  getWritingHistory: async (userId: string, page = 0, size = 10): Promise<PageResponse<ChallengeResponseDTO>> => {
    const response = await fetch(`${BASE_URL}/challenges/writing/user/${userId}?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<ChallengeResponseDTO>>(response);
  },

  getListeningHistory: async (userId: string, page = 0, size = 10): Promise<PageResponse<ChallengeResponseDTO>> => {
    const response = await fetch(`${BASE_URL}/challenges/listening/user/${userId}?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<ChallengeResponseDTO>>(response);
  },
};

// Vocabulary API
export const vocabularyApi = {
  getAll: async (userId: string, page = 0, size = 20): Promise<PageResponse<VocabularyResponse>> => {
    const response = await fetch(`${BASE_URL}/vocabulary/user/${userId}?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<VocabularyResponse>>(response);
  },

  getDue: async (userId: string, page = 0, size = 20): Promise<PageResponse<VocabularyResponse>> => {
    const response = await fetch(`${BASE_URL}/vocabulary/user/${userId}/due?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<PageResponse<VocabularyResponse>>(response);
  },

  review: async (id: string, correct: boolean): Promise<VocabularyResponse> => {
    const response = await fetch(`${BASE_URL}/vocabulary/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ correct }),
    });
    return handleResponse<VocabularyResponse>(response);
  },

  getStats: async (userId: string): Promise<VocabularyStatsResponse> => {
    const response = await fetch(`${BASE_URL}/vocabulary/user/${userId}/stats`, {
      headers: getHeaders(),
    });
    return handleResponse<VocabularyStatsResponse>(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/vocabulary/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },
};
