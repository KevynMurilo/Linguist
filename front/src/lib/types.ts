// API Types for Linguist-Core

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AIProvider = 'gemini' | 'openai' | 'perplexity' | 'deepseek';

// User types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: LanguageLevel;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface UpdateUserRequest {
  name?: string;
  targetLanguage?: string;
  level?: LanguageLevel;
  dailyGoal?: number;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: LanguageLevel;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  totalPracticeSessions: number;
  dailyGoal: number;
  createdAt: string;
}

// Lesson types
export interface LessonRequestDTO {
  userId: string;
  topic: string;
  targetLanguage?: string;
}

export interface LessonResponseDTO {
  id: string;
  topic: string;
  targetLanguage: string;
  simplifiedText: string;
  phoneticMarkers: string;
  teachingNotes: string;
  vocabularyList: string | null;
  culturalNote: string | null;
  grammarFocus: string[];
  level: LanguageLevel;
  audioSpeedMin: number;
  audioSpeedMax: number;
  completed: boolean;
  bestScore: number;
  timesAttempted: number;
  completedAt: string | null;
}

// Speech analysis types
export interface SpeechAnalysisRequest {
  userId: string;
  lessonId: string;
  spokenText: string;
}

export interface SpeechError {
  expected: string;
  got: string;
  rule: string;
  tip: string;
}

// Explain Word types
export interface ExplainWordRequest {
  userId: string;
  lessonId: string;
  word: string;
  context?: string;
}

export interface ExplainWordResponse {
  word: string;
  definition: string;
  pronunciation: string;
  usage: string;
  examples: string[];
  relatedWords: string[];
}

export interface SpeechAnalysisResponse {
  accuracy: number;
  errors: SpeechError[];
  feedback: string;
}

// Exercise types
export interface ExerciseDTO {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface RelatedLessonDTO {
  id: string;
  topic: string;
  targetLanguage: string;
  bestScore: number;
  completed: boolean;
}

export interface ExercisesResponse {
  competence: CompetenceResponse;
  exercises: ExerciseDTO[];
  relatedLessons: RelatedLessonDTO[];
}

export interface SubmitExercisesResponse {
  previousMastery: number;
  newMastery: number;
  change: number;
  competence: CompetenceResponse;
}

// Mastery types
export interface CompetenceResponse {
  id: string;
  ruleName: string;
  masteryLevel: number;
  failCount: number;
  practiceCount: number;
  lastPracticed: string | null;
  nextReviewAt: string | null;
}

export interface RecordPracticeRequest {
  userId: string;
  ruleName: string;
  success: boolean;
}

// Progress types
export interface DashboardResponse {
  currentLevel: LanguageLevel;
  nextLevel: LanguageLevel | null;
  eligibleForPromotion: boolean;
  averageMastery: number;
  totalRulesTracked: number;
  rulesMastered: number;
  rulesWeak: number;
  averageAccuracy: number;
  totalSessions: number;
  totalLessons: number;
  lessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  sessionsLast7Days: number;
  weakestRules: string[];
  dailyGoalTarget: number;
  dailyGoalProgress: number;
  dueReviewCount: number;
}

export type ActivityType = 'LESSON' | 'WRITING' | 'LISTENING';

export interface TimelineEntry {
  sessionId: string;
  lessonId: string | null;
  type: ActivityType;
  title: string;
  score: number;
  errorCount: number | null;
  feedback: string;
  practicedAt: string;
}

export interface LevelCheckResponse {
  previousLevel: LanguageLevel;
  currentLevel: LanguageLevel;
  promoted: boolean;
  averageMastery: number;
  rulesMastered: number;
  requiredMastery: number;
  requiredRulesMastered: number;
  message: string;
}

export interface PracticeSessionResponseDTO {
  id: string;
  accuracy: number;
  transcribedText: string;
  feedback: string;
  createdAt: string;
  audioUrl: string;
}

// Error types
export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  details: string[] | null;
  timestamp: string;
}

// AI Config (stored locally)
export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

// Mastery level helpers
export type MasteryLevel = 'critical' | 'weak' | 'progressing' | 'good' | 'mastered';

export function getMasteryLevel(value: number): MasteryLevel {
  if (value < 30) return 'critical';
  if (value < 50) return 'weak';
  if (value < 70) return 'progressing';
  if (value < 90) return 'good';
  return 'mastered';
}

export function getMasteryLabel(level: MasteryLevel): string {
  const labels: Record<MasteryLevel, string> = {
    critical: 'Needs Work',
    weak: 'Weak',
    progressing: 'Progressing',
    good: 'Good',
    mastered: 'Mastered',
  };
  return labels[level];
}

export function getMasteryLabelKey(level: MasteryLevel): string {
  const keys: Record<MasteryLevel, string> = {
    critical: 'masteryLevel.critical',
    weak: 'masteryLevel.weak',
    progressing: 'masteryLevel.progressing',
    good: 'masteryLevel.good',
    mastered: 'masteryLevel.mastered',
  };
  return keys[level];
}

export function getMasteryColor(level: MasteryLevel): string {
  const colors: Record<MasteryLevel, string> = {
    critical: 'bg-mastery-critical',
    weak: 'bg-mastery-weak',
    progressing: 'bg-mastery-progressing',
    good: 'bg-mastery-good',
    mastered: 'bg-mastery-mastered',
  };
  return colors[level];
}

export function getLevelColor(level: LanguageLevel): string {
  const colors: Record<LanguageLevel, string> = {
    A1: 'bg-level-a1',
    A2: 'bg-level-a2',
    B1: 'bg-level-b1',
    B2: 'bg-level-b2',
    C1: 'bg-level-c1',
    C2: 'bg-level-c2',
  };
  return colors[level];
}

// ─── Challenge Types ────────────────────────────────────────

export type ChallengeType = 'WRITING' | 'LISTENING';

export interface GenerateChallengeRequest {
  userId: string;
  targetLanguage?: string;
}

export interface SubmitWritingRequest {
  userId: string;
  challengeId: string;
  text: string;
}

export interface SubmitListeningRequest {
  userId: string;
  challengeId: string;
  typedText: string;
}

export interface ChallengeResponseDTO {
  id: string;
  type: ChallengeType;
  level: LanguageLevel;
  targetLanguage: string;
  prompt: string;
  originalText: string | null;
  studentResponse: string | null;
  score: number | null;
  feedback: string | null;
  analysisJson: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface WritingAnalysis {
  score: number;
  feedback: string;
  errors: WritingError[];
  grading: {
    grammar: number;
    vocabulary: number;
    coherence: number;
    spelling: number;
    levelAppropriateness: number;
  };
}

export interface WritingError {
  original: string;
  correction: string;
  rule: string;
  explanation: string;
}

export interface ListeningAnalysis {
  score: number;
  feedback: string;
  words: WordComparison[];
}

export interface WordComparison {
  expected: string;
  got: string | null;
  correct: boolean;
}

// Vocabulary types
export interface VocabularyResponse {
  id: string;
  word: string;
  translation: string;
  context: string | null;
  masteryLevel: number;
  reviewCount: number;
  nextReviewAt: string | null;
  createdAt: string;
}

export interface VocabularyStatsResponse {
  totalWords: number;
  masteredWords: number;
  dueForReview: number;
}
