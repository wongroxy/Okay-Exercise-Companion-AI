import React, { useState, useCallback } from 'react';
import { ImageCapture } from './components/ImageCapture';
import { ResultsDisplay } from './components/ResultsDisplay';
import { EssayResultsDisplay } from './components/EssayResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { gradeQuizFromImage, gradeEssayFromImage } from './services/geminiService';
import { GradingResult, EssayGradingResult, ModelType } from './types';
import { ImageEditor } from './components/ImageEditor';
import { HomeScreen } from './components/HomeScreen';
import { DatabaseScreen } from './components/DatabaseScreen';
import { saveQuizSession, saveEssay } from './services/databaseService';
import { fileToDataUrl } from './utils/fileUtils';
import { useI18n } from './hooks/useI18n';
import { SettingsMenu } from './components/SettingsMenu';
import { Button } from './components/Button';
import { BACKGROUNDTILE_URL, LOGO_URL } from './config';

type View = 'home' | 'checkAnswer' | 'gradeEssay' | 'database';
type GradingState = 'initial' | 'grading' | 'results' | 'error';

export default function App() {
  const { t } = useI18n();
  const [currentView, setCurrentView] = useState<View>('home');
  const [gradingState, setGradingState] = useState<GradingState>('initial');
  
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-2.5-flash');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  const [quizResult, setQuizResult] = useState<GradingResult | null>(null);
  const [essayResult, setEssayResult] = useState<EssayGradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [editingImage, setEditingImage] = useState<{ index: number; file: File } | null>(null);

  const resetGrader = useCallback(() => {
    setGradingState('initial');
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviewUrls([]);
    setQuizResult(null);
    setEssayResult(null);
    setError(null);
  }, [imagePreviewUrls]);

  const navigate = (view: View) => {
    resetGrader();
    setCurrentView(view);
  };

  const handleImagesAdd = (files: File[]) => {
    const newFiles = Array.from(files);
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviewUrls(prev => [...prev, ...newUrls]);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviewUrls(prev => {
        const urlToRemove = prev[indexToRemove];
        if (urlToRemove) {
            URL.revokeObjectURL(urlToRemove);
        }
        return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleStartEditing = (indexToEdit: number) => {
    const fileToEdit = imageFiles[indexToEdit];
    if (fileToEdit) {
      setEditingImage({ index: indexToEdit, file: fileToEdit });
    }
  };
  
  const handleSaveEditedImage = (newFile: File) => {
    if (editingImage === null) return;
    const { index } = editingImage;
  
    const newImageFiles = [...imageFiles];
    newImageFiles[index] = newFile;
    setImageFiles(newImageFiles);
  
    const newPreviewUrls = [...imagePreviewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls[index] = URL.createObjectURL(newFile);
    setImagePreviewUrls(newPreviewUrls);
  
    setEditingImage(null);
  };
  
  const handleCancelEditing = () => {
    setEditingImage(null);
  };

  const handleGradeQuiz = useCallback(async () => {
    if (imageFiles.length === 0) return;

    setGradingState('grading');
    setError(null);

    try {
      const result = await gradeQuizFromImage(imageFiles, selectedModel);
      setQuizResult(result);
      setGradingState('results');
      
      const dataUrls = await Promise.all(imageFiles.map(fileToDataUrl));
      saveQuizSession(result, dataUrls);

    } catch (err: any) {
      const errorMessage = err.message || 'error.unknown';
      const [key, originalMessage] = errorMessage.split(/:(.*)/s);
      setError(t(key, { message: originalMessage }));
      setGradingState('error');
    }
  }, [imageFiles, selectedModel, t]);

  const handleGradeEssay = useCallback(async () => {
    if (imageFiles.length === 0) return;

    setGradingState('grading');
    setError(null);

    try {
      const result = await gradeEssayFromImage(imageFiles, selectedModel);
      setEssayResult(result);
      setGradingState('results');
      
      const dataUrls = await Promise.all(imageFiles.map(fileToDataUrl));
      saveEssay(result, dataUrls);

    // FIX: Corrected a malformed catch block which was causing numerous parsing errors.
    } catch (err: any) {
      const errorMessage = err.message || 'error.unknown';
      const [key, originalMessage] = errorMessage.split(/:(.*)/s);
      setError(t(key, { message: originalMessage }));
      setGradingState('error');
    }
  }, [imageFiles, selectedModel, t]);
  
  const renderGraderContent = () => {
    switch (gradingState) {
      case 'grading':
        return <LoadingSpinner message={t('loading.aiWorking')} />;
      case 'results':
        if (currentView === 'checkAnswer' && quizResult) {
            return <ResultsDisplay result={quizResult} imagePreviewUrls={imagePreviewUrls} />;
        }
        if (currentView === 'gradeEssay' && essayResult) {
            return <EssayResultsDisplay result={essayResult} imagePreviewUrls={imagePreviewUrls} />;
        }
        return null;
      case 'error':
        return (
            <div className="text-center p-8 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg backdrop-blur-sm bg-opacity-90">
                <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">{t('error.title')}</h3>
                <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
            </div>
        );
      case 'initial':
      default:
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="mb-6">
                    <label className="block text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 bg-white/50 dark:bg-black/30 p-1 rounded w-fit mx-auto px-3 backdrop-blur-sm">
                        {t('checker.chooseModel')}
                    </label>
                    <div className="relative flex w-full max-w-xs mx-auto p-1 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-inner">
                        <button
                            onClick={() => setSelectedModel('gemini-2.5-flash')}
                            className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                                selectedModel === 'gemini-2.5-flash' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {t('checker.model.flash.name')}
                            <p className="text-xs text-gray-400 dark:text-gray-500">{t('checker.model.flash.description')}</p>
                        </button>
                        <button
                            onClick={() => setSelectedModel('gemini-2.5-pro')}
                            className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                                selectedModel === 'gemini-2.5-pro' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {t('checker.model.pro.name')}
                            <p className="text-xs text-gray-400 dark:text-gray-500">{t('checker.model.pro.description')}</p>
                        </button>
                    </div>
                </div>
                <ImageCapture 
                    onImagesAdd={handleImagesAdd}
                    removeImage={handleRemoveImage}
                    onImageEdit={handleStartEditing}
                    imagePreviewUrls={imagePreviewUrls}
                />
            </div>
        );
    }
  };

  const renderView = () => {
    switch(currentView) {
      case 'database':
        return <DatabaseScreen />;
      case 'checkAnswer':
      case 'gradeEssay':
        return renderGraderContent();
      case 'home':
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case 'home':
        return t('app.subtitle.home');
      case 'checkAnswer':
        return t('app.subtitle.checkAnswer');
      case 'gradeEssay':
        return t('app.subtitle.gradeEssay');
      case 'database':
        return t('app.subtitle.database');
      default:
        return '';
    }
  };

  const renderFooterButtons = () => {
    // Handle database view
    if (currentView === 'database') {
      return (
        <div className="w-full max-w-md mx-auto">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('home')}
            className="w-full flex items-center justify-center shadow-lg"
          >
            {t('nav.backToHome')}
          </Button>
        </div>
      );
    }
    
    // Handle grading views
    if (currentView === 'checkAnswer' || currentView === 'gradeEssay') {
        switch (gradingState) {
            case 'grading':
                return null;
            case 'results':
            case 'error':
                return (
                    <div className="w-full max-w-md mx-auto flex flex-col sm:flex-row gap-4">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => navigate('home')}
                            className="w-full sm:w-1/2 flex items-center justify-center shadow-lg"
                        >
                            {t('button.complete')}
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={resetGrader}
                            className="w-full sm:w-1/2 flex items-center justify-center shadow-lg"
                        >
                            {currentView === 'checkAnswer' ? t('checker.gradeAnotherQuiz') : t('checker.gradeAnotherEssay')}
                        </Button>
                    </div>
                );
            case 'initial': {
                const isEssay = currentView === 'gradeEssay';
                if (imageFiles.length === 0) {
                     return (
                        <div className="w-full max-w-md mx-auto">
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => navigate('home')}
                                className="w-full flex items-center justify-center shadow-lg"
                            >
                                {t('nav.backToHome')}
                            </Button>
                        </div>
                    );
                }
                return (
                    <div className="w-full max-w-md mx-auto flex flex-row gap-4">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => navigate('home')}
                            className="w-1/2 flex items-center justify-center shadow-lg"
                        >
                            {t('nav.backToHome')}
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={isEssay ? handleGradeEssay : handleGradeQuiz}
                            className="w-1/2 flex items-center justify-center bg-green-600 hover:bg-green-700 shadow-lg"
                        >
                            {isEssay ? t('checker.gradeEssay') : t('checker.gradeQuiz')}
                        </Button>
                    </div>
                );
            }
            default:
                return null;
        }
    }
    
    // For home view or others, no footer
    return null;
  }

  return (
    <div 
      className="
        min-h-screen 
        text-gray-800 dark:text-gray-200 
        flex flex-col items-center 
        p-4 sm:p-6 lg:p-8 
        transition-colors duration-300
        bg-white
        bg-[image:linear-gradient(rgba(253,250,245,0.8),rgba(253,250,245,0.8)),var(--bg-pattern)]
        dark:bg-[image:linear-gradient(rgba(0,0,0,0.9),rgba(0,0,0,0.9)),var(--bg-pattern)]
        bg-[length:auto,200px]
        bg-[position:0_0,0_0]
        bg-repeat
      "
      style={{
        '--bg-pattern': `url(${BACKGROUNDTILE_URL})`,
      } as React.CSSProperties}
    >
      <header className="relative z-50 w-full max-w-4xl mx-auto mb-8 flex items-center justify-between gap-4 p-4">
        {/* Left Slot */}
        <div className="flex justify-start" style={{ flex: '1 0 0' }}>
          {/* Placeholder for left alignment balance */}
        </div>
        
        {/* Center Slot */}
        <div className="text-center flex flex-col items-center">
            <img src={LOGO_URL} alt="Eduvantech Logo" className="h-12 sm:h-16 mb-2 object-contain" />
            <h1 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 drop-shadow-sm">
              {t('app.title')}
            </h1>
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 font-medium">
                {getSubtitle()}
              </p>
            </div>
        </div>

        {/* Right Slot */}
        <div className="flex justify-end" style={{ flex: '1 0 0' }}>
          <SettingsMenu />
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center">
        {renderView()}
      </main>

      {editingImage && (
        <ImageEditor 
          file={editingImage.file} 
          onSave={handleSaveEditedImage} 
          onCancel={handleCancelEditing} 
        />
      )}

      <footer className="w-full max-w-4xl mx-auto mt-8">
        {renderFooterButtons()}
      </footer>
    </div>
  );
}