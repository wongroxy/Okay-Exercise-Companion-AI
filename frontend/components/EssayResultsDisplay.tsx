import React from 'react';
import { EssayGradingResult } from '../types';
import { useI18n } from '../hooks/useI18n';

interface ScoreDisplayProps {
  label: string;
  score: number;
  maxScore?: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ label, score, maxScore }) => (
  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
      {score}{maxScore && <span className="text-base font-normal text-gray-400 dark:text-gray-500"> / {maxScore}</span>}
    </p>
  </div>
);

export const EssayResultsDisplay: React.FC<{ result: EssayGradingResult, imagePreviewUrls: string[] }> = ({ result, imagePreviewUrls }) => {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{result.title}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{t('essay.subtitle')}</p>
      </div>

      {/* Scores Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('essay.scores')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ScoreDisplay label={t('essay.scores.content')} score={result.scores.content} maxScore={40} />
            <ScoreDisplay label={t('essay.scores.expression')} score={result.scores.expression} maxScore={30} />
            <ScoreDisplay label={t('essay.scores.structure')} score={result.scores.structure} maxScore={20} />
            <ScoreDisplay label={t('essay.scores.punctuation')} score={result.scores.punctuation} maxScore={10} />
            <ScoreDisplay label={t('essay.scores.typoBonus')} score={result.scores.typoBonus} maxScore={3} />
            <ScoreDisplay label={t('essay.scores.total')} score={result.scores.total} maxScore={103} />
        </div>
      </div>
      
      {/* Transcribed Text and Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Transcribed Text */}
            <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('essay.transcribedText')}</h3>
                <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-serif leading-relaxed">{result.transcribedText}</p>
                </div>
            </div>
            {/* Right Column: Overall Comment & Detailed Feedback */}
            <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('essay.feedback')}</h3>
                <div>
                    <h4 className="font-bold text-lg text-gray-700 dark:text-gray-300">{t('essay.overallComment')}</h4>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">{result.overallComment}</p>
                </div>
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {Object.entries(result.feedback).map(([key, value]) => (
                        <div key={key}>
                            <h5 className="font-semibold text-gray-600 dark:text-gray-400 capitalize">{t(`essay.criteria.${key}`)}</h5>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Original Images */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('essay.originalImages')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {imagePreviewUrls.map((url, index) => (
            <div key={url} className="aspect-w-1 aspect-h-1">
              <img src={url} alt={`Essay page ${index + 1}`} className="rounded-lg shadow-md w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

       {result.tokenUsage && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
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
    </div>
  );
};