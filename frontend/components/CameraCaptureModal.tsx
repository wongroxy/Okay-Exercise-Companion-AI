import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import { CameraIcon } from './icons';
import { dataUrlToFile } from '../utils/fileUtils';

interface CameraCaptureModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onCapture, onClose }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setError(t('camera.noCamera'));
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError(t('camera.noCamera'));
      }
    };

    startCamera();

    // Cleanup function to stop the camera stream when the component unmounts
    return () => {
      cleanupCamera();
    };
  }, [t, cleanupCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const capturedFile = dataUrlToFile(dataUrl, `capture-${Date.now()}.jpg`);
        onCapture(capturedFile);
        cleanupCamera();
      }
    }
  };

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('camera.modalTitle')}</h3>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-grow p-4 overflow-hidden flex justify-center items-center bg-black min-h-0">
          {error ? (
            <div className="text-center text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-full"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center">
          <button
            onClick={handleCapture}
            disabled={!!error}
            className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            aria-label={t('camera.captureButton')}
          >
            <CameraIcon className="w-8 h-8" />
          </button>
        </footer>
      </div>
    </div>
  );
};
