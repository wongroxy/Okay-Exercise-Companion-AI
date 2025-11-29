import React from 'react';
import { SettingsMenu } from './SettingsMenu';
import { LOGO_URL } from '../config';
import { useI18n } from '../hooks/useI18n';

interface HeaderProps {
    subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ subtitle }) => {
    const { t } = useI18n();

    // Actually, let's use the GoogleLogin component which gives the ID token directly.
    // But wait, I want a custom button style maybe?
    // If I use useGoogleLogin, I get an access token. I can verify that too, but ID token is standard for backend auth.
    // Let's use the GoogleLogin component for now.

    return (
        <header className="relative z-50 w-full max-w-4xl mx-auto mb-8 flex items-center justify-between gap-4 p-4">
            {/* Left Slot */}
            <div className="flex justify-start items-center gap-2" style={{ flex: '1 0 0' }}>
            </div>

            {/* Center Slot */}
            <div className="text-center flex flex-col items-center">
                <img src={LOGO_URL} alt="Eduvantech Logo" className="h-12 sm:h-16 mb-2 object-contain" />
                <h1 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 drop-shadow-sm">
                    {t('app.title')}
                </h1>
                <div className="flex flex-col items-center gap-1 mt-2">
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 font-medium">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Right Slot */}
            <div className="flex justify-end items-center gap-2" style={{ flex: '1 0 0' }}>
                <SettingsMenu />
            </div>
        </header>
    );
};
