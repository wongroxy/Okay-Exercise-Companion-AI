import React, { useState, useEffect, useCallback } from 'react';
import { ReviewQuestion, QuizSession, SavedEssay } from '../types';
import { getQuizSessions, clearQuizSessions, updateReviewQuestion, getSavedEssays, clearSavedEssays } from '../services/databaseService';
import { XCircleIcon, DatabaseIcon, CheckCircleIcon } from './icons';
import { EssayResultsDisplay } from './EssayResultsDisplay';
import { MathText } from './MathText';
import { useI18n } from '../hooks/useI18n';
import { Button } from './Button';

type ViewType = 'quizzes' | 'essays';
type FilterType = 'all' | 'solved' | 'notSolved';

const ImageModal: React.FC<{ imageUrls: string[], onClose: () => void }> = ({ imageUrls, onClose }) => {
    const { t } = useI18n();
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => setCurrentIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
    const goToNext = () => setCurrentIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-3xl max-h-[90vh]"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking on the image/modal content
            >
                <img 
                    src={imageUrls[currentIndex]} 
                    alt={`Quiz page ${currentIndex + 1}`} 
                    className="w-full h-auto object-contain max-h-[90vh] rounded-lg" 
                />
                
                <button 
                    onClick={onClose}
                    className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200 transition-colors"
                    aria-label="Close"
                >
                    <XCircleIcon className="w-8 h-8" />
                </button>
                
                {imageUrls.length > 1 && (
                    <>
                        <button
                            onClick={goToPrevious}
                            className="absolute top-1/2 left-2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full p-2 hover:bg-opacity-60 transition-colors"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute top-1/2 right-2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full p-2 hover:bg-opacity-60 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full">
                            {t('markedImage.page', { current: currentIndex + 1, total: imageUrls.length })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const ReviewQuestionCard: React.FC<{ 
    item: ReviewQuestion;
    sessionId: number;
    onUpdate: (sessionId: number, questionId: string, updates: Partial<Omit<ReviewQuestion, 'id'>>) => void;
}> = ({ item, sessionId, onUpdate }) => {
    const { t } = useI18n();
    const [reanswerValue, setReanswerValue] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    
    // A question needs review if it was originally wrong and has not been successfully re-answered yet.
    const needsReview = !item.isCorrect;
    const isFirstAttemptFailed = item.reanswerAttempts > 0 && !item.isSolved;

    const handleCheck = () => {
        const isCorrect = reanswerValue.trim().toLowerCase() === item.correctAnswer?.trim().toLowerCase();
        
        onUpdate(sessionId, item.id, {
            reanswerAttempts: item.reanswerAttempts + 1,
            isSolved: isCorrect,
        });
        setReanswerValue('');
    };

    // Show answer if: 
    // 1. It was originally correct (though these are usually filtered out in review view)
    // 2. User has solved it in review
    // 3. User has tried at least once and failed
    // 4. User explicitly requested to see it
    const shouldShowAnswer = item.isCorrect || item.isSolved || isFirstAttemptFailed || showCorrectAnswer;
    
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 transition-all duration-300 overflow-hidden border-l-4 ${item.isCorrect ? 'border-blue-500' : (item.isSolved ? 'border-green-500' : 'border-red-500')}`}>
        <div className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.section} - {t('questionCard.question', { number: item.questionNumber })}</p>
                    <MathText as="p" text={item.question} className="mt-1 text-lg text-gray-800 dark:text-gray-200" />
                </div>
                {item.isCorrect 
                    ? <div className="w-8 h-8 text-blue-500 ml-4 flex-shrink-0 flex items-center justify-center font-bold text-lg">✓</div>
                    : (item.isSolved 
                        ? <CheckCircleIcon className="w-8 h-8 text-green-500 ml-4 flex-shrink-0" />
                        : <XCircleIcon className="w-8 h-8 text-red-500 ml-4 flex-shrink-0" />
                    )
                }
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{t('reviewCard.yourOriginalAnswer')} </span>
                    {item.studentAnswer === 'No answer provided' ? (
                        <span className="italic text-gray-400 dark:text-gray-500">{t('questionCard.noAnswer')}</span>
                    ) : (
                        <MathText text={item.studentAnswer} />
                    )}
                </p>
                 {/* Only show correct answer if the user has attempted it or solved it */}
                 {!item.isCorrect && shouldShowAnswer && (
                    <div className="text-sm text-green-700 dark:text-green-400 mt-2">
                        <span className="font-semibold">{t('questionCard.correctAnswer')} </span>
                        <MathText text={item.correctAnswer} />
                    </div>
                 )}
            </div>
        </div>
        
        {needsReview && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4">
                {item.isSolved ? (
                     <div className="text-center p-4 bg-green-100 dark:bg-green-900/50 rounded-md">
                        <h4 className="font-bold text-green-800 dark:text-green-300">{t('reviewCard.solved')}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('reviewCard.solvedMessage', { attempts: item.reanswerAttempts })}</p>
                     </div>
                ) : (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor={`reanswer-${item.id}`}>
                            {t('reviewCard.reanswer', { attempts: item.reanswerAttempts + 1 })}
                        </label>
                        <div className="flex gap-2">
                            {item.questionType === 'multiple-choice' && item.choices && item.choices.length > 0 ? (
                                <select
                                    id={`reanswer-${item.id}`}
                                    value={reanswerValue}
                                    onChange={(e) => setReanswerValue(e.target.value)}
                                    className="flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                                >
                                    <option value="">{t('reviewCard.selectAnswer')}</option>
                                    {item.choices.map(choice => (
                                        <option key={choice} value={choice}>{choice}</option>
                                    ))}
                                </select>
                            ) : item.questionType === 'short-answer' ? (
                                <textarea
                                    id={`reanswer-${item.id}`}
                                    value={reanswerValue}
                                    onChange={(e) => setReanswerValue(e.target.value)}
                                    rows={3}
                                    className="flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                                    placeholder={t('reviewCard.typeDetailedAnswer')}
                                />
                            ) : (
                                <input
                                    id={`reanswer-${item.id}`}
                                    type="text"
                                    value={reanswerValue}
                                    onChange={(e) => setReanswerValue(e.target.value)}
                                    className="flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                                    placeholder={t('reviewCard.typeAnswer')}
                                />
                            )}
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleCheck}
                                disabled={!reanswerValue.trim()}
                            >
                                {t('reviewCard.check')}
                            </Button>
                        </div>
                        
                        {/* Option to show answer if user is stuck */}
                        {!shouldShowAnswer && (
                             <div className="mt-2 text-right">
                                <button 
                                    onClick={() => { setShowCorrectAnswer(true); setShowExplanation(true); }}
                                    className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                    {t('reviewCard.showCorrectAnswer')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {(isFirstAttemptFailed || showExplanation || item.isSolved) && item.explanation && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
                        <div>
                             {item.isSolved || showExplanation ? (
                                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                                    <span className="font-semibold">{t('questionCard.explanation')} </span>
                                    <MathText text={item.explanation} />
                                </div>
                            ) : (
                                isFirstAttemptFailed && (
                                    <button onClick={() => setShowExplanation(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                        {t('reviewCard.showExplanation')}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    );
};

const SessionAccordion: React.FC<{ 
    session: QuizSession, 
    defaultOpen?: boolean,
    onUpdateQuestion: (sessionId: number, questionId: string, updates: Partial<Omit<ReviewQuestion, 'id'>>) => void;
    onViewImages: (urls: string[]) => void;
    filteredQuestions: ReviewQuestion[];
}> = ({ session, defaultOpen = false, onUpdateQuestion, onViewImages, filteredQuestions }) => {
    const { t, language } = useI18n();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const formattedDate = new Date(session.timestamp).toLocaleString(language, {
        dateStyle: 'long',
        timeStyle: 'short'
    });

    const title = formattedDate;
    const subtitle = t('session.score', { score: session.score, total: session.totalQuestions });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 overflow-hidden">
            <div className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-grow flex justify-between items-center text-left"
                >
                    <div>
                        <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                    </div>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-6 h-6 text-gray-500 dark:text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <div className="flex items-center gap-2 ml-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewImages(session.imageUrls)}
                        title={t('database.viewImages')}
                    >
                       {t('database.viewImages')}
                    </Button>
                </div>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {filteredQuestions.map((item) => (
                        <ReviewQuestionCard 
                            key={item.id}
                            item={item} 
                            sessionId={session.timestamp}
                            onUpdate={onUpdateQuestion}
                        />
                    ))}
                </div>
            )}
        </div>
    )
};

const EssayAccordion: React.FC<{
    essay: SavedEssay,
    defaultOpen?: boolean
}> = ({ essay, defaultOpen = false }) => {
    const { t, language } = useI18n();
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const formattedDate = new Date(essay.timestamp).toLocaleString(language, {
        dateStyle: 'long',
        timeStyle: 'short'
    });
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 overflow-hidden">
             <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="text-left">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{essay.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-6 h-6 text-gray-500 dark:text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-1 sm:p-0 border-t border-gray-200 dark:border-gray-700">
                    <EssayResultsDisplay result={essay} imagePreviewUrls={essay.imageUrls} />
                </div>
            )}
        </div>
    )
}

export const DatabaseScreen: React.FC = () => {
    const { t } = useI18n();
    const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
    const [savedEssays, setSavedEssays] = useState<SavedEssay[]>([]);
    const [view, setView] = useState<ViewType>('quizzes');
    const [quizFilter, setQuizFilter] = useState<FilterType>('notSolved');
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);

    const loadData = useCallback(() => {
        const quizzes = getQuizSessions();
        const essays = getSavedEssays();
        setQuizSessions(quizzes.sort((a, b) => b.timestamp - a.timestamp));
        setSavedEssays(essays.sort((a, b) => b.timestamp - a.timestamp));
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateQuestion = useCallback((
        sessionId: number,
        questionId: string,
        updates: Partial<Omit<ReviewQuestion, 'id'>>
    ) => {
        updateReviewQuestion(sessionId, questionId, updates);
        loadData(); // Reload all data to reflect update
    }, [loadData]);

    const handleClearDatabase = () => {
        const isQuizzes = view === 'quizzes';
        const confirmMessage = isQuizzes ? t('database.clearQuizzesConfirm') : t('database.clearEssaysConfirm');
        if (window.confirm(confirmMessage)) {
            if (isQuizzes) {
                clearQuizSessions();
            } else {
                clearSavedEssays();
            }
            loadData();
        }
    };

    const filteredQuizSessions = quizSessions.map(session => {
        let filteredQuestions;
        if (quizFilter === 'all') {
            filteredQuestions = session.questions;
        } else {
            // "notSolved" means it was originally wrong and has not yet been re-answered correctly.
            // "solved" means it was originally wrong but HAS been re-answered correctly.
            // Correctly answered original questions are not shown in these two filters.
            filteredQuestions = session.questions.filter(q => {
                if (q.isCorrect) return false; // Exclude originally correct questions from solved/notSolved filters
                return quizFilter === 'solved' ? q.isSolved : !q.isSolved;
            });
        }
        return { ...session, questions: filteredQuestions };
    }).filter(session => session.questions.length > 0);
    
    const hasData = quizSessions.length > 0 || savedEssays.length > 0;
    const hasDataInCurrentView = view === 'quizzes' ? quizSessions.length > 0 : savedEssays.length > 0;

    const renderContent = () => {
        if (view === 'quizzes') {
            if (filteredQuizSessions.length > 0) {
                return filteredQuizSessions.map((session, index) => (
                    <SessionAccordion 
                        key={session.timestamp} 
                        session={session}
                        defaultOpen={index === 0}
                        onUpdateQuestion={handleUpdateQuestion}
                        onViewImages={setViewingImages}
                        filteredQuestions={session.questions}
                    />
                ));
            }
            return (
                 <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <DatabaseIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                        {quizSessions.length > 0 ? t('database.empty.title.noFilterMatch') : t('database.empty.title.emptyDB')}
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        {quizSessions.length > 0 
                            ? t('database.empty.description.noFilterMatch')
                            : t('database.empty.description.emptyDB')
                        }
                    </p>
                </div>
            )
        }

        if (view === 'essays') {
            if (savedEssays.length > 0) {
                 return savedEssays.map((essay, index) => (
                    <EssayAccordion 
                        key={essay.timestamp} 
                        essay={essay}
                        defaultOpen={index === 0}
                    />
                ));
            }
             return (
                 <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <DatabaseIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('database.empty.title.noEssays')}</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">{t('database.empty.description.noEssays')}</p>
                </div>
            )
        }

        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
             {viewingImages && <ImageModal imageUrls={viewingImages} onClose={() => setViewingImages(null)} />}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('database.title')}</h2>
                <div className="flex items-center gap-4">
                    {hasDataInCurrentView && (
                        <Button
                            variant="destructive"
                            onClick={handleClearDatabase}
                        >
                            {view === 'quizzes' ? t('database.clearQuizzes') : t('database.clearEssays')}
                        </Button>
                    )}
                </div>
            </div>

            {hasData && (
                <div className="mb-6 flex justify-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <button
                        onClick={() => setView('quizzes')}
                        className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                            view === 'quizzes' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        {t('database.viewQuizzes')}
                    </button>
                     <button
                        onClick={() => setView('essays')}
                        className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                            view === 'essays' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        {t('database.viewEssays')}
                    </button>
                </div>
            )}
            
            {view === 'quizzes' && quizSessions.length > 0 && (
                 <div className="mb-6 flex justify-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    {(['notSolved', 'solved', 'all'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setQuizFilter(f)}
                            className={`w-1/3 rounded-md py-2 text-sm font-medium capitalize transition-colors focus:outline-none ${
                                quizFilter === f ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {t(`database.filter.${f}`)}
                        </button>
                    ))}
                 </div>
            )}
            
            <div>{renderContent()}</div>
        </div>
    );
};