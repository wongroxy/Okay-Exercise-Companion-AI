import React, { useState, useEffect } from 'react';
import { GradingResult, GradedQuestion, QuestionWithGraphic, BoundingBox } from '../types';
import { CheckCircleIcon, XCircleIcon, MinusCircleIcon } from './icons';
import { MarkedImageView } from './MarkedImageView';
import { QuestionBankView } from './QuestionBankView';
import { LoadingSpinner } from './LoadingSpinner';
import { MathText } from './MathText';
import { useI18n } from '../hooks/useI18n';

interface ScoreCircleProps {
  score: number;
  total: number;
}

const ScoreCircle: React.FC<ScoreCircleProps> = ({ score, total }) => {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-green-500';
  if (percentage < 70) colorClass = 'text-yellow-500';
  if (percentage < 40) colorClass = 'text-red-500';

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="52"
          cx="60"
          cy="60"
        />
        <circle
          className={colorClass}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="52"
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col justify-center items-center">
        <span className={`text-4xl font-bold ${colorClass}`}>{score}</span>
        <span className="text-xl text-gray-500 dark:text-gray-400">/ {total}</span>
      </div>
    </div>
  );
};

interface ResultsDisplayProps {
  result: GradingResult;
  imagePreviewUrls: string[];
}

const QuestionCard: React.FC<{ item: GradedQuestion }> = ({ item }) => {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('questionCard.question', { number: item.questionNumber })}</p>
          <MathText as="div" text={item.question} className="mt-1 text-gray-800 dark:text-gray-200" />
        </div>
        {item.isCorrect ? (
          <CheckCircleIcon className="w-8 h-8 text-green-500 ml-4 flex-shrink-0" />
        ) : (
          <XCircleIcon className="w-8 h-8 text-red-500 ml-4 flex-shrink-0" />
        )}
      </div>
      <div className={`mt-3 pt-3 border-t ${item.isCorrect ? 'border-green-200 dark:border-green-700' : 'border-red-200 dark:border-red-700'}`}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">{t('questionCard.yourAnswer')} </span>
          {item.studentAnswer === 'No answer provided' ? (
            <span className="italic text-gray-400 dark:text-gray-500">{t('questionCard.noAnswer')}</span>
          ) : (
            <MathText text={item.studentAnswer} />
          )}
        </p>
        {!item.isCorrect && (
          <>
            <div className="text-sm text-green-700 dark:text-green-400 mt-2">
              <span className="font-semibold">{t('questionCard.correctAnswer')} </span>
              <MathText text={item.correctAnswer} />
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
              <span className="font-semibold">{t('questionCard.explanation')} </span>
              <MathText text={item.explanation} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to crop an image based on a bounding box
const cropImageFromUrl = (
  imageUrl: string,
  box: BoundingBox,
  expansionFactor: number = 0.3
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // In case images are on a different origin
    img.src = imageUrl;

    img.onload = () => {
      const { naturalWidth: iw, naturalHeight: ih } = img;

      // Convert normalized box to pixel values
      const boxX = box.x * iw;
      const boxY = box.y * ih;
      let boxW = box.width * iw;
      let boxH = box.height * ih;

      // FIX: Enforce a minimum dimension to prevent invalid crop sizes.
      // If the model returns a zero-width or zero-height box, we'll give it a small default size.
      const MIN_DIMENSION = 10; // 10 pixels
      if (boxW <= 0) {
        boxW = MIN_DIMENSION;
      }
      if (boxH <= 0) {
        boxH = MIN_DIMENSION;
      }

      // Calculate expanded dimensions
      const expansionW = boxW * expansionFactor;
      const expansionH = boxH * expansionFactor;

      let cropX = Math.max(0, boxX - expansionW);
      let cropY = Math.max(0, boxY - expansionH);
      let cropW = Math.min(iw - cropX, boxW + 2 * expansionW);
      let cropH = Math.min(ih - cropY, boxH + 2 * expansionH);

      // Ensure dimensions are positive
      if (cropW <= 0 || cropH <= 0) {
        return reject(new Error('Calculated crop dimensions are invalid.'));
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context.'));
      }

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL());
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image for cropping: ${err}`));
    };
  });
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, imagePreviewUrls }) => {
  const { t } = useI18n();
  const [view, setView] = useState<'summary' | 'marked' | 'questions'>('summary');
  const [questionBank, setQuestionBank] = useState<QuestionWithGraphic[]>([]);
  const [isGeneratingBank, setIsGeneratingBank] = useState(false);

  // Effect to generate the question bank when the results are available
  useEffect(() => {
    const generateQuestionBank = async () => {
      setIsGeneratingBank(true);
      const bank: QuestionWithGraphic[] = [];
      const validQuestions = result.questions.filter(q => q.boundingBox && q.correctAnswer);

      for (const q of validQuestions) {
        try {
          const imageUrl = imagePreviewUrls[q.boundingBox!.imageIndex];
          const graphic = await cropImageFromUrl(imageUrl, q.boundingBox!);
          
          bank.push({
            section: q.section,
            questionNumber: q.questionNumber,
            question: q.question,
            correctAnswer: q.correctAnswer!,
            explanation: q.explanation,
            questionGraphic: graphic,
          });
        } catch (error) {
          console.error(`Could not generate graphic for question ${q.questionNumber}:`, error);
        }
      }
      setQuestionBank(bank);
      setIsGeneratingBank(false);
    };

    if (result.questions.length > 0 && imagePreviewUrls.length > 0) {
      generateQuestionBank();
    }
  }, [result, imagePreviewUrls]);
  
  const groupedBySection: Record<string, GradedQuestion[]> = {};
  for (const q of result.questions) {
    const section = q.section || 'General Questions';
    if (!groupedBySection[section]) {
      groupedBySection[section] = [];
    }
    groupedBySection[section].push(q);
  }

  const correctCount = result.score;
  const notAnsweredCount = result.questions.filter(
    (q) => q.studentAnswer === 'No answer provided'
  ).length;
  const wrongCount = result.totalQuestions - correctCount - notAnsweredCount;


  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center justify-between">
        <div className='flex-grow text-center md:text-left'>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('results.title')}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{t('results.subtitle')}</p>
          
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-center">
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/50 rounded-lg min-w-[120px]">
              <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg text-green-600 dark:text-green-400">{correctCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('results.correct')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/50 rounded-lg min-w-[120px]">
              <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg text-red-600 dark:text-red-400">{wrongCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('results.wrong')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg min-w-[120px]">
              <MinusCircleIcon className="w-6 h-6 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg text-gray-600 dark:text-gray-300">{notAnsweredCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('results.notAnswered')}</p>
              </div>
            </div>
          </div>
          
           {result.tokenUsage && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="font-semibold">{t('results.tokenUsage.input')}</span> {result.tokenUsage.inputTokens}</span>
                <span><span className="font-semibold">{t('results.tokenUsage.output')}</span> {result.tokenUsage.outputTokens}</span>
                <span className="font-bold"><span className="font-semibold">{t('results.tokenUsage.total')}</span> {result.tokenUsage.totalTokens}</span>
              </div>
              {result.cost && (
                <div className="mt-1 font-semibold text-blue-600 dark:text-blue-400">
                  {t('results.cost')} ~HK$ {result.cost.hkd.toFixed(4)} (US$ {result.cost.usd.toFixed(6)})
                </div>
              )}
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('results.aiBreakdown.title')}</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{t('results.aiBreakdown.model')}</span> {result.model || 'N/A'}
            </p>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-1">{t('results.aiBreakdown.tasksPerformed')}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('results.aiBreakdown.task1')}</li>
                <li>{t('results.aiBreakdown.task2')}</li>
                <li>{t('results.aiBreakdown.task3')}</li>
                <li>{t('results.aiBreakdown.task4')}</li>
                <li>{t('results.aiBreakdown.task5')}</li>
                <li>{t('results.aiBreakdown.task6')}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-6 md:mt-0 md:ml-8 flex-shrink-0">
          <ScoreCircle score={result.score} total={result.totalQuestions} />
        </div>
      </div>
      
      {imagePreviewUrls.length > 0 && (
        <div className="mb-6 flex justify-center border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-3 text-md font-medium transition-colors focus:outline-none ${view === 'summary' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {t('results.tabs.summary')}
          </button>
          <button
            onClick={() => setView('marked')}
            className={`px-4 py-3 text-md font-medium transition-colors focus:outline-none ${view === 'marked' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {t('results.tabs.marked')}
          </button>
          <button
            onClick={() => setView('questions')}
            className={`px-4 py-3 text-md font-medium transition-colors focus:outline-none ${view === 'questions' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {t('results.tabs.questions')}
          </button>
        </div>
      )}

      {view === 'summary' && (
        <div>
          {Object.entries(groupedBySection).map(([section, questionsInSection]) => (
            <div key={section} className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">{section}</h3>
              {questionsInSection.map((item) => (
                <QuestionCard key={`${section}-${item.questionNumber}`} item={item} />
              ))}
            </div>
          ))}
        </div>
      )}
      {view === 'marked' && imagePreviewUrls.length > 0 && (
        <MarkedImageView imageUrls={imagePreviewUrls} questions={result.questions} />
      )}
      {view === 'questions' && (
        isGeneratingBank ? <LoadingSpinner /> : <QuestionBankView questions={questionBank} />
      )}
    </div>
  );
};