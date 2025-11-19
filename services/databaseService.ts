import { GradedQuestion, QuizSession, ReviewQuestion, SavedEssay, EssayGradingResult, GradingResult } from '../types';

const QUIZ_DB_KEY = 'quizDatabase';
const ESSAY_DB_KEY = 'essayDatabase';

/**
 * Retrieves all saved quiz sessions from local storage.
 * @returns An array of QuizSession objects.
 */
export const getQuizSessions = (): QuizSession[] => {
  try {
    const data = localStorage.getItem(QUIZ_DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse quiz sessions from localStorage", error);
    return [];
  }
};

/**
 * Saves a new quiz result as a new session.
 * All questions are converted to ReviewQuestions.
 * @param result The full grading result.
 * @param imageUrls The data URLs of the original images.
 */
export const saveQuizSession = (result: GradingResult, imageUrls: string[]) => {
  if (result.questions.length === 0) return;
  
  try {
    const existingSessions = getQuizSessions();
    const timestamp = Date.now();

    const newSession: QuizSession = {
      timestamp: timestamp,
      imageUrls: imageUrls,
      score: result.score,
      totalQuestions: result.totalQuestions,
      questions: result.questions.map((q, index) => ({
        ...q,
        id: `${timestamp}-${index}`,
        isSolved: q.isCorrect, // Correct answers are considered "solved"
        reanswerAttempts: 0,
      })),
    };
    
    const updatedSessions = [...existingSessions, newSession];
    localStorage.setItem(QUIZ_DB_KEY, JSON.stringify(updatedSessions));
    
  } catch (error) {
    console.error("Failed to save quiz session to localStorage", error);
  }
};

/**
 * Updates the status of a specific question within a session.
 * @param sessionId The timestamp of the session.
 * @param questionId The unique ID of the question to update.
 * @param updates The properties of the question to update (e.g., isSolved, reanswerAttempts).
 */
export const updateReviewQuestion = (
  sessionId: number,
  questionId: string,
  updates: Partial<Omit<ReviewQuestion, 'id'>>
) => {
  try {
    const allSessions = getQuizSessions();
    const sessionIndex = allSessions.findIndex(s => s.timestamp === sessionId);
    if (sessionIndex === -1) return;

    const questionIndex = allSessions[sessionIndex].questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    allSessions[sessionIndex].questions[questionIndex] = {
      ...allSessions[sessionIndex].questions[questionIndex],
      ...updates,
    };

    localStorage.setItem(QUIZ_DB_KEY, JSON.stringify(allSessions));
  } catch (error) {
    console.error("Failed to update question in localStorage", error);
  }
};


/**
 * Clears all quiz sessions from the database in local storage.
 */
export const clearQuizSessions = () => {
  try {
    localStorage.removeItem(QUIZ_DB_KEY);
  } catch (error) {
    console.error("Failed to clear quiz sessions from localStorage", error);
  }
};

/**
 * Retrieves all saved essays from local storage.
 * @returns An array of SavedEssay objects.
 */
export const getSavedEssays = (): SavedEssay[] => {
  try {
    const data = localStorage.getItem(ESSAY_DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse essays from localStorage", error);
    return [];
  }
};

/**
 * Saves a new graded essay.
 * @param essayResult The result from the grading service.
 * @param imageUrls The data URLs of the essay images.
 */
export const saveEssay = (essayResult: EssayGradingResult, imageUrls: string[]) => {
  try {
    const existingEssays = getSavedEssays();
    const newSavedEssay: SavedEssay = {
      ...essayResult,
      timestamp: Date.now(),
      imageUrls: imageUrls,
    };
    
    const updatedEssays = [...existingEssays, newSavedEssay];
    localStorage.setItem(ESSAY_DB_KEY, JSON.stringify(updatedEssays));
    
// FIX: Corrected a malformed catch block.
  } catch (error) {
    console.error("Failed to save essay to localStorage", error);
  }
};

/**
 * Clears all saved essays from the database in local storage.
 */
export const clearSavedEssays = () => {
  try {
    localStorage.removeItem(ESSAY_DB_KEY);
  } catch (error) {
    console.error("Failed to clear essays from localStorage", error);
  }
};