

import React from 'react';
import { useI18n } from '../hooks/useI18n';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">{message || t('loading.aiWorking')}</p>
    </div>
  );
};