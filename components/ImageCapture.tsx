import React, { useRef, useState, useEffect } from 'react';
import { UploadCloudIcon, EditIcon, CameraIcon } from './icons';
import { useI18n } from '../hooks/useI18n';
import { CameraCaptureModal } from './CameraCaptureModal';
import { Button } from './Button';

interface ImageCaptureProps {
  onImagesAdd: (files: File[]) => void;
  removeImage: (index: number) => void;
  onImageEdit: (index: number) => void;
  imagePreviewUrls: string[];
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({ onImagesAdd, removeImage, onImageEdit, imagePreviewUrls }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  useEffect(() => {
    // A simple check to see if it's likely a desktop device by checking for touch capability.
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsDesktop(!isMobile);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImagesAdd(Array.from(files));
      event.target.value = ''; // Reset to allow re-selecting the same file
    }
  };

  const handleTakePhotoClick = () => {
    if (isDesktop) {
      setIsCameraModalOpen(true);
    } else {
      // On mobile, this specific input is for camera priority
      cameraInputRef.current?.click();
    }
  };
  
  const handleCaptureFromModal = (imageFile: File) => {
    onImagesAdd([imageFile]);
    setIsCameraModalOpen(false);
  };

  const triggerFileInput = () => {
    // This input doesn't have `capture` so it opens the file browser on desktop,
    // and the multi-option OS menu on mobile.
    fileInputRef.current?.click();
  };

  const renderDesktopUploader = () => (
     <div className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col justify-center items-center p-4 gap-4">
        <Button
          variant="primary"
          onClick={handleTakePhotoClick}
          className="w-full flex-1 flex flex-col items-center justify-center text-center py-2 px-4"
          aria-label={t('imageCapture.takePhoto')}
        >
          <CameraIcon className="w-8 h-8 mb-1" />
          <span className="text-sm">{t('imageCapture.takePhoto')}</span>
        </Button>
        
        <Button
          variant="secondary"
          onClick={triggerFileInput}
          className="w-full flex-1 flex flex-col items-center justify-center text-center py-2 px-4"
          aria-label={t('imageCapture.uploadFile')}
        >
          <UploadCloudIcon className="w-8 h-8 mb-1" />
          <span className="text-sm">{t('imageCapture.uploadFile')}</span>
        </Button>
      </div>
  );

  const renderMobileUploader = () => (
    <div 
      className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col justify-center items-center p-4 gap-4 cursor-pointer"
      onClick={triggerFileInput}
    >
      <CameraIcon className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
      <p className="font-semibold text-gray-700 dark:text-gray-300">{t('imageCapture.takeOrUpload')}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('imageCapture.tapToOpen')}</p>
    </div>
  );

  return (
    <div className="w-full mx-auto flex flex-col items-center">
       {isCameraModalOpen && (
        <CameraCaptureModal
          onCapture={handleCaptureFromModal}
          onClose={() => setIsCameraModalOpen(false)}
        />
      )}

      {/* Hidden input specifically for taking a photo with the camera (mobile) */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      {/* Hidden input for browsing files (desktop) or showing the OS menu (mobile) */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {imagePreviewUrls.map((url, index) => (
          <div key={url} className="relative group aspect-square">
            <img src={url} alt={`Quiz page ${index + 1}`} className="rounded-lg shadow-md w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
              <button
                onClick={() => onImageEdit(index)}
                className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 transition-colors focus:outline-none focus:ring-2 focus:ring-white opacity-0 group-hover:opacity-100"
                aria-label={t('imageCapture.editPage', { index: index + 1 })}
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 transition-colors focus:outline-none focus:ring-2 focus:ring-white opacity-0 group-hover:opacity-100"
                aria-label={t('imageCapture.removePage', { index: index + 1 })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        
        {isDesktop ? renderDesktopUploader() : renderMobileUploader()}
      </div>
       {imagePreviewUrls.length === 0 && (
         <p className="mt-4 text-gray-500 dark:text-gray-400">{t('imageCapture.initialPrompt')}</p>
      )}
    </div>
  );
};
