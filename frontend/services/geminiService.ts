import { GradingResult, EssayGradingResult, ModelType, ReviewQuestion, GeneratedQuestion } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000/api';

const handleApiError = (error: any) => {
  console.error('Error calling backend API:', error);

  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    message = JSON.stringify(error);
  }

  if (message.includes('Region not supported') || message.includes('PERMISSION_DENIED')) {
    throw new Error('error.unsupportedRegion');
  }
  if (message.includes('API key not valid')) {
    throw new Error('error.invalidApiKey');
  }
  if (message.includes('429') || message.includes('rate limit')) {
    throw new Error('error.rateLimit');
  }

  if (error instanceof Error) {
    throw new Error(`error.default:${error.message}`);
  }
  throw new Error('error.unknown');
};

export const gradeQuizFromImage = async (files: File[], model: ModelType): Promise<GradingResult> => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('model', model);

    const response = await fetch(`${API_BASE_URL}/gemini/grade-quiz`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};

export const gradeEssayFromImage = async (files: File[], model: ModelType): Promise<EssayGradingResult> => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('model', model);

    const response = await fetch(`${API_BASE_URL}/gemini/grade-essay`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};

export const generateSimilarQuestions = async (questions: ReviewQuestion[]): Promise<GeneratedQuestion[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini/generate-similar-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questions }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};

export const regenerateSingleQuestion = async (question: ReviewQuestion): Promise<Omit<GeneratedQuestion, 'originalQuestion'>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini/regenerate-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};
