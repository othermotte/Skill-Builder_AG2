
import React, { useState } from 'react';
import { saveAppFeedback } from '../services/firebase';

interface AppFeedbackFormProps {
    userId: string;
    userEmail: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const AppFeedbackForm: React.FC<AppFeedbackFormProps> = ({
    userId,
    userEmail,
    onSuccess,
    onCancel
}) => {
    const [feedbackContent, setFeedbackContent] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleSubmitFeedback = async () => {
        if (!feedbackContent.trim()) return;
        setIsSubmittingFeedback(true);
        try {
            await saveAppFeedback(userId, userEmail, feedbackContent);
            setFeedbackContent('');
            if (onSuccess) onSuccess();
            alert('Thank you for your feedback!');
        } catch (e) {
            alert('Failed to send feedback.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-gray-900 tracking-tight">How can we make Skill Builder better?</h4>
                <textarea
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Suggestions, bugs, or thoughts..."
                    className="w-full h-40 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-black/5 outline-none transition-all resize-none font-medium leading-relaxed"
                />
                <div className="flex gap-3">
                    <button
                        onClick={handleSubmitFeedback}
                        disabled={isSubmittingFeedback || !feedbackContent.trim()}
                        className="flex-1 bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/5"
                    >
                        {isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}
                    </button>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-8 py-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
                <div className="bg-indigo-50/50 rounded-[2rem] p-8 border border-indigo-100/50 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                        </div>
                        <h5 className="text-[10px] font-black uppercase text-indigo-900 tracking-widest">Need to send screenshots?</h5>
                    </div>
                    <p className="text-gray-600 text-xs font-medium leading-relaxed">
                        If you've encountered a visual bug or have a suggestion that requires images, please email Gary directly.
                    </p>
                    <a
                        href="mailto:gary@gardenersnotmechanics.com"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors group"
                    >
                        Email gary@gardenersnotmechanics.com
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
};
