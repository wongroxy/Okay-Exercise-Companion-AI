import React from 'react';
import { DatabaseIcon, GradeIcon } from './icons';
import { useI18n } from '../hooks/useI18n';

type View = 'home' | 'checkAnswer' | 'gradeEssay' | 'database';

interface HomeScreenProps {
  onNavigate: (view: View) => void;
}

const HomeCard: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBgClass: string;
  iconTextClass: string;
}> = ({ onClick, icon, title, description, iconBgClass, iconTextClass }) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all transform h-full"
  >
    <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${iconBgClass} mb-4`}>
      <div className={iconTextClass}>{icon}</div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
  </div>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        
        <HomeCard
          onClick={() => onNavigate('checkAnswer')}
          icon={<GradeIcon className="h-8 w-8" />}
          title={t('home.checkAnswer.title')}
          description={t('home.checkAnswer.description')}
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconTextClass="text-blue-600 dark:text-blue-400"
        />
        
        <HomeCard
          onClick={() => onNavigate('gradeEssay')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>}
          title={t('home.gradeEssay.title')}
          description={t('home.gradeEssay.description')}
          iconBgClass="bg-green-100 dark:bg-green-900/50"
          iconTextClass="text-green-600 dark:text-green-400"
        />

        <div className="md:col-span-2 flex justify-center">
          <div className="w-full md:max-w-md">
            <HomeCard
              onClick={() => onNavigate('database')}
              icon={<DatabaseIcon className="h-8 w-8" />}
              title={t('home.database.title')}
              description={t('home.database.description')}
              iconBgClass="bg-purple-100 dark:bg-purple-900/50"
              iconTextClass="text-purple-600 dark:text-purple-400"
            />
          </div>
        </div>
        
      </div>
    </div>
  );
};