
import { GoogleGenAI, Type } from '@google/genai';
import { GradingResult, EssayGradingResult, ModelType, ReviewQuestion, GeneratedQuestion } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

// NOTE: These pricing values are for estimation purposes.
// Please refer to the official Google Cloud documentation for the most up-to-date pricing.
const PRICING_DATA = {
  'gemini-2.5-flash': {
    INPUT_USD_PER_1K_TOKENS: 0.00035,
    OUTPUT_USD_PER_1K_TOKENS: 0.00070,
  },
  'gemini-2.5-pro': {
    INPUT_USD_PER_1K_TOKENS: 0.0035,
    OUTPUT_USD_PER_1K_TOKENS: 0.0105,
  },
  'gemini-3-pro-preview': {
    INPUT_USD_PER_1K_TOKENS: 0.0035, // Estimated same as 2.5 pro for preview
    OUTPUT_USD_PER_1K_TOKENS: 0.0105,
  }
};
const USD_TO_HKD = 7.8;

// FIX: Initialize GoogleGenAI client according to SDK guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Define a strict JSON schema for the Gemini API response to ensure consistent output.
const gradingSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: 'An array of all questions found on the quiz pages.',
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING, description: 'The section title of the question (e.g., "Multiple Choice", "Fill in the Blanks"). If no section, use a general title like "Questions".' },
          questionNumber: { type: Type.STRING, description: 'The question number (e.g., "1", "2a").' },
          question: { type: Type.STRING, description: 'The full text of the question.' },
          questionType: { type: Type.STRING, description: 'The type of the question. Must be one of "multiple-choice", "fill-in-the-blank", or "short-answer".' },
          choices: { 
            type: Type.ARRAY, 
            description: 'If the questionType is "multiple-choice", provide an array of the full text for each option, including the label (e.g., "A. 4", "B. 5"). Otherwise, this field is not needed.', 
            items: { type: Type.STRING } 
          },
          studentAnswer: { type: Type.STRING, description: "The student's transcribed answer. This must be an exact copy of what's written. If no answer is provided, use the string 'No answer provided'." },
          isCorrect: { type: Type.BOOLEAN, description: 'Whether the student\'s answer is correct.' },
          correctAnswer: { type: Type.STRING, description: 'The correct answer if the student was wrong. For multiple-choice questions, this MUST be the full text of the correct choice. Optional.' },
          explanation: { type: Type.STRING, description: 'A brief explanation for why the answer is incorrect. Optional.' },
          boundingBox: {
            type: Type.OBJECT,
            description: "The bounding box coordinates of the student's answer on the image. This is required for each question.",
            properties: {
              x: { type: Type.NUMBER, description: 'The top-left x-coordinate of the box (normalized 0-1 relative to image width).' },
              y: { type: Type.NUMBER, description: 'The top-left y-coordinate of the box (normalized 0-1 relative to image height).' },
              width: { type: Type.NUMBER, description: 'The width of the box (normalized 0-1 relative to image width).' },
              height: { type: Type.NUMBER, description: 'The height of the box (normalized 0-1 relative to image height).' },
              imageIndex: { type: Type.INTEGER, description: 'The 0-based index of the image in the input array where the answer is located.' },
            },
            required: ['x', 'y', 'width', 'height', 'imageIndex'],
          },
        },
        required: ['section', 'questionNumber', 'question', 'questionType', 'studentAnswer', 'isCorrect', 'boundingBox'],
      },
    },
    score: { type: Type.INTEGER, description: 'The total number of correct answers.' },
    totalQuestions: { type: Type.INTEGER, description: 'The total number of questions graded.' },
  },
  required: ['questions', 'score', 'totalQuestions'],
};

const essayGradingSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'The title of the essay. If no title is found, use "Untitled Essay".' },
      scores: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.NUMBER, description: 'Score for content (out of 40).' },
          expression: { type: Type.NUMBER, description: 'Score for expression (out of 30).' },
          structure: { type: Type.NUMBER, description: 'Score for structure (out of 20).' },
          punctuation: { type: Type.NUMBER, description: 'Score for punctuation and handwriting (out of 10).' },
          typoBonus: { type: Type.NUMBER, description: 'Bonus score for having no typos (3 points if no typos, 0 otherwise).' },
          total: { type: Type.NUMBER, description: 'The total score (sum of all other scores).' },
        },
        required: ['content', 'expression', 'structure', 'punctuation', 'typoBonus', 'total'],
      },
      overallComment: { type: Type.STRING, description: 'A detailed overall comment on the essay, providing constructive feedback.' },
      feedback: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: 'Specific, constructive feedback on the content, citing examples from the text.' },
          expression: { type: Type.STRING, description: 'Specific, constructive feedback on the expression and use of language, citing examples.' },
          structure: { type: Type.STRING, description: 'Specific, constructive feedback on the structure and organization.' },
          punctuation: { type: Type.STRING, description: 'Specific, constructive feedback on punctuation and handwriting legibility.' },
        },
        required: ['content', 'expression', 'structure', 'punctuation'],
      },
    },
    required: ['title', 'scores', 'overallComment', 'feedback'],
};

const similarQuestionSchema = {
    type: Type.OBJECT,
    properties: {
      questionText: { type: Type.STRING, description: 'The full text of the newly generated question.' },
      questionType: { type: Type.STRING, description: 'The type of the question. Must be one of "multiple-choice", "fill-in-the-blank", or "short-answer". This must match the original question\'s type.' },
      choices: { 
        type: Type.ARRAY, 
        description: 'If the questionType is "multiple-choice", provide a new array of full-text options for the new question. Otherwise, this field is not needed.', 
        items: { type: Type.STRING } 
      },
    },
    required: ['questionText', 'questionType'],
};

const similarQuestionsListSchema = {
  type: Type.OBJECT,
  properties: {
    generatedQuestions: {
      type: Type.ARRAY,
      description: 'An array of newly generated questions, one for each original question provided.',
      items: similarQuestionSchema,
    },
  },
  required: ['generatedQuestions'],
};


const calculateCost = (model: ModelType, usageMetadata: any) => {
    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usageMetadata;
    if (promptTokenCount !== undefined && candidatesTokenCount !== undefined && totalTokenCount !== undefined) {
        const tokenUsage = {
            inputTokens: promptTokenCount,
            outputTokens: candidatesTokenCount,
            totalTokens: totalTokenCount,
        };

        const modelPricing = PRICING_DATA[model] || PRICING_DATA['gemini-2.5-pro'];
        const inputCostUSD = (promptTokenCount / 1000) * modelPricing.INPUT_USD_PER_1K_TOKENS;
        const outputCostUSD = (candidatesTokenCount / 1000) * modelPricing.OUTPUT_USD_PER_1K_TOKENS;
        const totalCostUSD = inputCostUSD + outputCostUSD;
        const totalCostHKD = totalCostUSD * USD_TO_HKD;

        const cost = {
            usd: totalCostUSD,
            hkd: totalCostHKD,
        };
        return { tokenUsage, cost };
    }
    return {};
}

const handleApiError = (error: any) => {
    console.error('Error calling Gemini API:', error);

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
  const imageParts = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      };
    })
  );

  const prompt = `You are an expert AI quiz grader acting as a strict, accurate, and consistent teacher. Your primary goal is to meticulously analyze the following quiz page images, identify each question, and evaluate the student's answer with high precision. Provide the output in a structured JSON format.

  **Core Principles:**
  - **Language Consistency:** Your entire JSON output, including explanations, correct answers, and section titles, MUST be in the same language as the text found in the quiz images. For example, if the quiz is in Traditional Chinese, your response must also be in Traditional Chinese.
  - **Accuracy:** Double-check every answer and explanation for correctness.
  - **Consistency:** Apply the same rigorous grading standard to all questions.
  - **Strictness:** If an answer is incomplete or only partially correct, it must be marked as incorrect. Provide clear explanations for your reasoning.

  **Instructions:**
  1. Go through each image and identify all questions and their corresponding student-written answers.
  2. For each question, determine its type: "multiple-choice", "fill-in-the-blank", or "short-answer".
  3. If the question is "multiple-choice", you MUST extract the full text for each option (including the label, e.g., "A. 4") and provide them in the "choices" array.
  4. **Crucially, transcribe the student's answer *exactly* as it is written, preserving any errors. The transcription must match the photo. Do not correct the answer during this step.** If an answer is blank or cannot be found, use the string "No answer provided".
  5. Determine if the student's transcribed answer is correct. Your evaluation must be strict.
  6. If the answer is incorrect, provide the correct answer and a detailed explanation for why the student's answer is wrong. For multiple-choice questions, the correct answer MUST be the full string of the correct option from the "choices" array.
  7. For any mathematical equations, formulas, or special characters in the question, correct answer, or explanation, you MUST use LaTeX notation. Wrap inline math with single dollar signs ($...$) and block/display math with double dollar signs ($$...$$). For example, the square root of 2 should be written as '$\\sqrt{2}$' and the fraction one-half as '$\\frac{1}{2}$'. Use a single backslash for LaTeX commands.
  8. For each student's answer, provide a normalized bounding box (coordinates from 0 to 1) indicating its location on the image. Specify which image it's on using the 0-based 'imageIndex'. It is crucial that every graded question has a bounding box.
  9. Group questions by section if sections are present (e.g., "Multiple Choice", "Short Answer"). If not, use a generic name like "Questions".
  10. Calculate the final score (total number of correct answers) and the total number of questions.
  11. **Return ONLY the JSON object that strictly conforms to the provided schema. Consistency in output format is paramount.** Do not include any other text, comments, or markdown formatting like \`\`\`json.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }, ...imageParts] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: gradingSchema,
      },
    });

    const text = response.text;
    let resultData: GradingResult;

    try {
      resultData = JSON.parse(text) as GradingResult;
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('error.jsonParse');
    }

    resultData.model = model;

    if (response.usageMetadata) {
        const { tokenUsage, cost } = calculateCost(model, response.usageMetadata);
        resultData.tokenUsage = tokenUsage;
        resultData.cost = cost;
    }

    return resultData;
  } catch (error) {
    handleApiError(error);
    // The line below will not be reached because handleApiError throws,
    // but it's needed for TypeScript to know the function always returns/throws.
    throw new Error('error.unknown');
  }
};

export const gradeEssayFromImage = async (files: File[], model: ModelType): Promise<EssayGradingResult> => {
  const imageParts = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      };
    })
  );

  // === STEP 1: Transcribe Text from Images ===
  const transcriptionPrompt = `Transcribe the handwritten text from the following images. The images represent sequential pages of a single essay. You must correctly identify the writing direction (modern horizontal left-to-right OR traditional vertical right-to-left) to ensure an accurate transcription. Return ONLY the full transcribed text.`;
  
  let transcribedText = '';
  let transcriptionUsageMetadata: any;
  try {
    const transcriptionResponse = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: transcriptionPrompt }, ...imageParts] }],
    });
    transcribedText = transcriptionResponse.text;
    transcriptionUsageMetadata = transcriptionResponse.usageMetadata;
  } catch (error) {
    console.error("Error during essay transcription step:", error);
    handleApiError(error);
    throw new Error('error.unknown'); // Should not be reached
  }

  // === STEP 2: Grade the Transcribed Text ===
  const gradingPrompt = `You are a professional and strict Hong Kong Chinese literature teacher. Your single most important task is to output a single, valid, and complete JSON object matching the provided schema.

  **Instructions:**
  1.  **Language Consistency:** All your feedback, titles, and comments MUST be in the same language as the provided 'Essay Text to Grade'.
  2.  Grade the following essay text meticulously based on the Hong Kong Scoring Criteria.
  3.  Identify the essay's title from the text. If there is no clear title, use "Untitled Essay".
  4.  Provide scores and detailed, constructive feedback for each category, citing specific examples from the text to justify your evaluation.
  5.  Your ONLY output must be the JSON object. Do not include any other text or markdown.

  **Hong Kong Scoring Criteria:**
  *   **內容 (Content - 40 points)**: Assess how well the essay addresses the prompt. If the essay is off-topic (離題), the maximum score for this category is 12 points.
  *   **表達 (Expression - 30 points)**: Evaluate writing style, word choice, and sentence fluency.
  *   **結構 (Structure - 20 points)**: Assess the essay's organization, including introduction, body, and conclusion.
  *   **標點字體 (Punctuation & Handwriting - 10 points)**: Evaluate the correct use of punctuation. For this text-only grading, focus on punctuation and assume handwriting was legible.
  *   **錯別字 (Typo Bonus - 3 extra points)**: Award 3 bonus points ONLY if the essay contains zero typos or incorrect characters. Otherwise, the score is 0.

  **Essay Text to Grade:**
  ---
  ${transcribedText}
  ---
  `;

  try {
    const gradingResponse = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: gradingPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: essayGradingSchema,
        temperature: 0.2,
      },
    });

    const text = gradingResponse.text;
    let gradingData: Omit<EssayGradingResult, 'transcribedText'>;

    try {
      const cleanedText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      gradingData = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse JSON response for essay grading:', text);
      throw new Error('error.jsonParse');
    }

    // Combine results from both steps
    const finalResult: EssayGradingResult = {
      ...gradingData,
      transcribedText: transcribedText,
    };

    // Combine token usage and cost from both API calls
    if (transcriptionUsageMetadata && gradingResponse.usageMetadata) {
      const totalUsage = {
        promptTokenCount: (transcriptionUsageMetadata.promptTokenCount || 0) + (gradingResponse.usageMetadata.promptTokenCount || 0),
        candidatesTokenCount: (transcriptionUsageMetadata.candidatesTokenCount || 0) + (gradingResponse.usageMetadata.candidatesTokenCount || 0),
        totalTokenCount: (transcriptionUsageMetadata.totalTokenCount || 0) + (gradingResponse.usageMetadata.totalTokenCount || 0),
      };
      const { tokenUsage, cost } = calculateCost(model, totalUsage);
      finalResult.tokenUsage = tokenUsage;
      finalResult.cost = cost;
    }

    return finalResult;
  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};


export const generateSimilarQuestions = async (questions: ReviewQuestion[]): Promise<GeneratedQuestion[]> => {
  const originalQuestionsText = questions.map((q, i) => 
    `Question ${i+1} (Type: ${q.questionType}):\n${q.question}\nCorrect Answer: ${q.correctAnswer}\n`
  ).join('\n---\n');

  const prompt = `You are an expert educator creating a practice worksheet. Based on the following list of original questions, your task is to generate a new, similar question for each one.

**Instructions:**
1.  **Language Consistency:** The newly generated questions MUST be in the same language as the original questions provided.
2.  **Analyze Each Question**: For each original question, first identify its core learning objective (e.g., "solving two-step linear equations", "identifying the main verb in a sentence", "understanding photosynthesis").
3.  **Create a New Question**: Generate a brand new question that tests the exact same learning objective and is the same question type ('multiple-choice', 'fill-in-the-blank', 'short-answer'). The content, numbers, or context must be different, but the skill being tested must be the same.
4.  **Maintain Format**: If the original is multiple-choice, create new choices. For math questions, use LaTeX for all formulas (e.g., $\\frac{1}{2}$).
5.  **Output JSON**: Return ONLY a single JSON object that contains a "generatedQuestions" array, where each element corresponds to an original question.

**Original Questions:**
${originalQuestionsText}

**Your output must strictly conform to the provided JSON schema. Do not include any other text or markdown.**`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: similarQuestionsListSchema,
        temperature: 0.8,
      },
    });

    const text = response.text;
    let resultData: { generatedQuestions: Omit<GeneratedQuestion, 'originalQuestion'>[] };

    try {
      resultData = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON for similar questions:', text);
      throw new Error('error.jsonParse');
    }
    
    // Combine the generated data with the original question for context
    return resultData.generatedQuestions.map((genQ, index) => ({
      ...genQ,
      originalQuestion: questions[index],
    }));

  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};

export const regenerateSingleQuestion = async (question: ReviewQuestion): Promise<Omit<GeneratedQuestion, 'originalQuestion'>> => {
  const originalQuestionText = `Question (Type: ${question.questionType}):\n${question.question}\nCorrect Answer: ${question.correctAnswer}\n`;

  const prompt = `You are an expert educator. Your task is to regenerate a single practice question.

**Instructions:**
1.  **Language Consistency:** The new question you generate MUST be in the same language as the original question provided.
2.  **Analyze the Original**: First, identify the core learning objective of the original question provided below (e.g., "solving two-step linear equations", "understanding photosynthesis").
3.  **Create a New Question**: Generate one brand new question that tests the exact same learning objective and is the same question type ('multiple-choice', 'fill-in-the-blank', 'short-answer'). The content, numbers, or context must be different, but the skill being tested must be the same.
4.  **Maintain Format**: If the original is multiple-choice, create new choices. For math questions, use LaTeX for all formulas.
5.  **Output JSON**: Return ONLY a single, valid JSON object matching the schema.

**Original Question:**
${originalQuestionText}

**Your output must be only the JSON object.**`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: similarQuestionSchema,
        temperature: 0.9, // Slightly higher temp for more variety in regeneration
      },
    });
    
    const text = response.text;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON for single regenerated question:', text);
      throw new Error('error.jsonParse');
    }

  } catch (error) {
    handleApiError(error);
    throw new Error('error.unknown');
  }
};
