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
} from './types';
import { useAppStore } from './store';

const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8080/api';

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
      message: 'An unexpected error occurred',
      details: null,
      timestamp: new Date().toISOString(),
    }));
    throw errorData;
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

  getByUser: async (userId: string): Promise<LessonResponseDTO[]> => {
    const response = await fetch(`${BASE_URL}/lessons/user/${userId}`, {
      headers: getHeaders(),
    });
    return handleResponse<LessonResponseDTO[]>(response);
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

  getHistory: async (lessonId: string, page: number = 0, size: number = 5): Promise<any> => {
    const response = await fetch(`${BASE_URL}/lessons/${lessonId}/sessions?page=${page}&size=${size}`, {
      headers: getHeaders(),
    });
    return handleResponse<any>(response);
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
  getByUser: async (userId: string): Promise<CompetenceResponse[]> => {
    const response = await fetch(`${BASE_URL}/mastery/user/${userId}`, {
      headers: getHeaders(),
    });
    return handleResponse<CompetenceResponse[]>(response);
  },

  getWeaknesses: async (userId: string, threshold: number = 60): Promise<CompetenceResponse[]> => {
    const response = await fetch(`${BASE_URL}/mastery/user/${userId}/weaknesses?threshold=${threshold}`, {
      headers: getHeaders(),
    });
    return handleResponse<CompetenceResponse[]>(response);
  },

  recordPractice: async (data: RecordPracticeRequest): Promise<CompetenceResponse> => {
    const response = await fetch(`${BASE_URL}/mastery/record`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<CompetenceResponse>(response);
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

  getTimeline: async (userId: string, days: number = 30): Promise<TimelineEntry[]> => {
    const response = await fetch(`${BASE_URL}/progress/user/${userId}/timeline?days=${days}`, {
      headers: getHeaders(),
    });
    return handleResponse<TimelineEntry[]>(response);
  },

  checkLevel: async (userId: string): Promise<LevelCheckResponse> => {
    const response = await fetch(`${BASE_URL}/progress/user/${userId}/check-level`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<LevelCheckResponse>(response);
  },
};
