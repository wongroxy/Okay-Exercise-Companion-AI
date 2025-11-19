import React, { useState, useEffect, useCallback } from 'react';
import { QuizSession, GeneratedQuestion } from '../types';
import { generateSimilarQuestions, regenerateSingleQuestion } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { MathText } from './MathText';
import { useI18n } from '../hooks/useI18n';
import { Button } from './Button';

// Make TypeScript aware of the global jsPDF object from the CDN script
declare const jspdf: any;

interface PdfGeneratorModalProps {
  session: QuizSession;
  onClose: () => void;
}

const PDF_PAGE_WIDTH = 210; // A4 width in mm
const PDF_PAGE_HEIGHT = 297; // A4 height in mm
const PDF_MARGIN = 15;
const PDF_LINE_HEIGHT = 7;
const PDF_FONT_SIZE = 12;

export const PdfGeneratorModal: React.FC<PdfGeneratorModalProps> = ({ session, onClose }) => {
  const { t } = useI18n();
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const generateQuestions = useCallback(async (questionsToGenerate: any[]) => {
    try {
      const result = await generateSimilarQuestions(questionsToGenerate);
      setGeneratedQuestions(result);
    } catch (err) {
      setError(t('pdfGenerator.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // We generate questions based on the full list from the session, not the filtered one
    if (session.questions.length > 0) {
      generateQuestions(session.questions);
    } else {
        setIsLoading(false);
    }
  }, [session.questions, generateQuestions]);

  const handleRegenerate = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const originalQuestion = generatedQuestions[index].originalQuestion;
      const newQuestionData = await regenerateSingleQuestion(originalQuestion);
      setGeneratedQuestions(prev => {
        const newQuestions = [...prev];
        newQuestions[index] = { ...newQuestionData, originalQuestion };
        return newQuestions;
      });
    } catch (err) {
      // Could show a small toast or error message here
      console.error("Failed to regenerate question", err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleExportPdf = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    let y = PDF_MARGIN;
    const maxWidth = PDF_PAGE_WIDTH - (PDF_MARGIN * 2);

    const addText = (text: string, x: number, yPos: number, options = {}) => {
        const lines = doc.splitTextToSize(text.replace(/(\$|\\\(|\\\[|\\\$)/g, ''), maxWidth - (x - PDF_MARGIN));
        doc.text(lines, x, yPos, options);
        return lines.length * PDF_LINE_HEIGHT;
    };

    doc.setFontSize(18);
    const title = t('pdfGenerator.modalTitle');
    y += addText(title, PDF_MARGIN, y);
    y += PDF_LINE_HEIGHT; // Add space after title

    doc.setFontSize(PDF_FONT_SIZE);
    
    generatedQuestions.forEach((q, index) => {
        const questionNumberText = `${index + 1}. `;
        const questionText = q.questionText;

        const combinedText = `${questionNumberText}${questionText}`;
        const questionHeight = addText(combinedText, PDF_MARGIN, y);
        
        if (y + questionHeight > PDF_PAGE_HEIGHT - PDF_MARGIN) {
            doc.addPage();
            y = PDF_MARGIN;
            addText(combinedText, PDF_MARGIN, y);
        } else {
             y += questionHeight;
        }

        if (q.questionType === 'multiple-choice' && q.choices) {
            q.choices.forEach(choice => {
                const choiceHeight = addText(choice, PDF_MARGIN + 5, y);
                if (y + choiceHeight > PDF_PAGE_HEIGHT - PDF_MARGIN) {
                    doc.addPage();
                    y = PDF_MARGIN;
                    addText(choice, PDF_MARGIN + 5, y);
                } else {
                    y += choiceHeight;
                }
            });
        }
        
        // Add space for writing the answer
        y += PDF_LINE_HEIGHT * 4; 
    });

    doc.save(`practice-sheet-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message={t('pdfGenerator.loadingMessage')} />;
    }
    if (error) {
      return (
        <div className="text-center p-8 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
          <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">{t('error.title')}</h3>
          <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
        </div>
      );
    }
    if (generatedQuestions.length === 0) {
        return <p>{t('questionBank.empty.title')}</p>
    }

    return (
        <div className="space-y-4">
            {generatedQuestions.map((q, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                {index + 1}. <MathText text={q.questionText} />
                            </p>
                            {q.questionType === 'multiple-choice' && q.choices && (
                                <div className="mt-2 space-y-1 pl-4">
                                    {q.choices.map((choice, i) => (
                                        <p key={i} className="text-gray-600 dark:text-gray-400"><MathText text={choice} /></p>
                                    ))}
                                </div>
                            )}
                            <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:underline">{t('pdfGenerator.originalQuestionLabel')}</summary>
                                <p className="mt-1 text-gray-400 dark:text-gray-500 italic">
                                    <MathText text={q.originalQuestion.question} />
                                </p>
                            </details>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerate(index)}
                            disabled={regeneratingIndex === index}
                            className="flex-shrink-0 rounded-full"
                        >
                            {regeneratingIndex === index ? (
                               <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                t('pdfGenerator.regenerateButton')
                            )}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('pdfGenerator.modalTitle')}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto">
          {renderContent()}
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
            <Button variant="secondary" onClick={onClose}>
                {t('button.cancel')}
            </Button>
            <Button
                variant="primary"
                onClick={handleExportPdf} 
                disabled={isLoading || error !== null || generatedQuestions.length === 0}
            >
                {t('pdfGenerator.exportButton')}
            </Button>
        </footer>
      </div>
    </div>
  );
};
