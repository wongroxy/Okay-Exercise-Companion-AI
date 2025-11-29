
// FIX: Removed circular self-import.

// FIX: Define ModelType and remove circular self-import.
export type ModelType = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-pro-preview';

// ADD: A type for supported languages.
export type Language = 'en' | 'zh-TW' | 'zh-CN';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  imageIndex: number;
}

export interface GradedQuestion {
  section: string;
  questionNumber: string;
  question: string;
  // ADD: A field to distinguish between question types.
  questionType: 'multiple-choice' | 'fill-in-the-blank' | 'short-answer';
  // ADD: An optional field for the options in a multiple-choice question.
  choices?: string[];
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
  boundingBox?: BoundingBox;
}

// ADD: A type for questions stored in the wrong-answer database, with review metadata.
export interface ReviewQuestion extends GradedQuestion {
  id: string; // A unique ID for this instance of the wrong answer.
  isSolved: boolean;
  reanswerAttempts: number;
}


export interface GradingResult {
  questions: GradedQuestion[];
  score: number;
  totalQuestions: number;
  model?: ModelType;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: {
    usd: number;
    hkd: number;
  };
}

// ADD: A type for the result of grading an essay.
export interface EssayGradingResult {
  title: string;
  scores: {
    content: number;
    expression: number;
    structure: number;
    punctuation: number;
    typoBonus: number;
    total: number;
  };
  transcribedText: string;
  overallComment: string;
  feedback: {
    content: string;
    expression: string;
    structure: string;
    punctuation: string;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: {
    usd: number;
    hkd: number;
  };
}

// ADD: A type for essays stored in the database.
export interface SavedEssay extends EssayGradingResult {
  timestamp: number;
  imageUrls: string[]; // Storing data URLs of the original images
}

export interface QuestionWithGraphic {
  section: string;
  questionNumber: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  questionGraphic: string; // Base64 data URL
}

export interface QuizSession {
  timestamp: number;
  questions: ReviewQuestion[];
  imageUrls: string[];
  score: number;
  totalQuestions: number;
  model?: string;
}

export interface GeneratedQuestion {
  questionText: string;
  questionType: 'multiple-choice' | 'fill-in-the-blank' | 'short-answer';
  choices?: string[];
  // Reference to the original for context during regeneration
  originalQuestion: ReviewQuestion;
}
