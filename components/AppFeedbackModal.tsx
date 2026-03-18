
import React from 'react';
import { AppFeedbackForm } from './AppFeedbackForm';

interface AppFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userEmail: string;
}

export const AppFeedbackModal: React.FC<AppFeedbackModalProps> = ({ isOpen, onClose, userId, userEmail }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] max-w-xl w-full p-10 md:p-12 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-10">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-2">Beta Feedback</h3>
                    <p className="text-gray-500 font-medium italic">Help us shape the future of Leadership Skill Builder.</p>
                </div>

                <AppFeedbackForm 
                    userId={userId} 
                    userEmail={userEmail} 
                    onSuccess={onClose}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
};
