import React from 'react';
import { QuestionWithGraphic } from '../types';
import { DownloadIcon } from './icons';
import { MathText } from './MathText';
import { useI18n } from '../hooks/useI18n';
import { Button } from './Button';

interface QuestionBankViewProps {
  questions: QuestionWithGraphic[];
}

const QuestionBankCard: React.FC<{ item: QuestionWithGraphic }> = ({ item }) => {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
      <div className="p-4">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {item.section} - {t('questionCard.question', { number: item.questionNumber })}
        </p>
        <MathText as="p" text={item.question} className="mt-2 text-gray-800 dark:text-gray-200" />
      </div>
      
      {item.questionGraphic && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 border-y border-gray-200 dark:border-gray-600">
          <img 
            src={item.questionGraphic} 
            alt={`Graphic for question ${item.questionNumber}`}
            className="max-w-xs mx-auto rounded" 
          />
        </div>
      )}

      <div className="p-4 bg-green-50 dark:bg-green-900/30">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-green-800 dark:text-green-300">{t('questionCard.correctAnswer')} </span>
          <MathText text={item.correctAnswer} />
        </div>
        {item.explanation && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span className="font-semibold">{t('questionCard.explanation')} </span>
            <MathText text={item.explanation} />
          </div>
        )}
      </div>
    </div>
  );
};


export const QuestionBankView: React.FC<QuestionBankViewProps> = ({ questions }) => {
  const { t } = useI18n();
  
  const handleDownload = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'quiz_questions.json');
    document.body.appendChild(linkElement); // Required for Firefox
    linkElement.click();
    document.body.removeChild(linkElement);
  };
  
  if (questions.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('questionBank.empty.title')}</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('questionBank.empty.description')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleDownload}
          variant="primary"
          className="inline-flex items-center gap-2"
        >
          <DownloadIcon className="w-5 h-5" />
          {t('questionBank.download')}
        </Button>
      </div>
      <div>
        {questions.map((item, index) => (
          <QuestionBankCard key={`${item.section}-${item.questionNumber}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
};
