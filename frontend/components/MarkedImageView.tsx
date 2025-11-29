import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GradedQuestion } from '../types';
import { useI18n } from '../hooks/useI18n';

interface MarkedImageViewProps {
  imageUrls: string[];
  questions: GradedQuestion[];
}

export const MarkedImageView: React.FC<MarkedImageViewProps> = ({ imageUrls, questions }) => {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImageUrl = imageUrls[currentIndex];
  const questionsForCurrentImage = questions.filter(
    (q) => q.boundingBox?.imageIndex === currentIndex
  );

  const calculateOverlayStyle = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const naturalAspectRatio = naturalWidth / naturalHeight;
    const clientAspectRatio = clientWidth / clientHeight;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (naturalAspectRatio > clientAspectRatio) {
      renderedWidth = clientWidth;
      renderedHeight = clientWidth / naturalAspectRatio;
      offsetX = 0;
      offsetY = (clientHeight - renderedHeight) / 2;
    } else {
      renderedHeight = clientHeight;
      renderedWidth = clientHeight * naturalAspectRatio;
      offsetX = (clientWidth - renderedWidth) / 2;
      offsetY = 0;
    }

    setOverlayStyle({
      position: 'absolute',
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      width: `${renderedWidth}px`,
      height: `${renderedHeight}px`,
      pointerEvents: 'none',
    });
  }, []);

  useEffect(() => {
    const imgElement = imgRef.current;
    const handleResize = () => calculateOverlayStyle();
    
    if (imgElement) {
      imgElement.addEventListener('load', handleResize);
    }
    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      if (imgElement) {
        imgElement.removeEventListener('load', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [currentIndex, calculateOverlayStyle]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="w-full mx-auto my-4">
      <div className="relative">
        <img
          ref={imgRef}
          src={currentImageUrl}
          onLoad={calculateOverlayStyle}
          alt={`Marked quiz page ${currentIndex + 1}`}
          className="rounded-lg shadow-lg w-full h-auto object-contain"
          style={{ maxHeight: '70vh' }}
        />
        
        {/* Container for overlays, sized and positioned to match the rendered image */}
        <div style={overlayStyle}>
          {questionsForCurrentImage.map((q, index) => {
            if (!q.boundingBox) return null;

            const { x, y, width, height } = q.boundingBox;
            const isCorrect = q.isCorrect;
            const borderColor = isCorrect ? 'border-green-500' : 'border-red-500';

            const boxStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            };

            // Style for the feedback tags in a column to the right of the image
            const feedbackStyle: React.CSSProperties = {
                position: 'absolute',
                top: `${(y + height / 2) * 100}%`,
                left: `102%`, // Position just outside the overlay container
                transform: 'translateY(-50%)',
                pointerEvents: 'auto', // Make tags clickable if needed in future
            };

            return (
              <React.Fragment key={`${q.questionNumber}-${index}`}>
                {/* The bounding box around the student's answer */}
                <div className={`border-2 ${borderColor} rounded-sm`} style={boxStyle} />

                {/* Display correct answer in a column for incorrect questions */}
                {!isCorrect && q.correctAnswer && (
                  <div style={feedbackStyle}>
                    <div className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap">
                      {q.correctAnswer}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {imageUrls.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full p-2 hover:bg-opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full p-2 hover:bg-opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="text-center mt-4">
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            {t('markedImage.page', { current: currentIndex + 1, total: imageUrls.length })}
          </p>
        </div>
      )}
    </div>
  );
};