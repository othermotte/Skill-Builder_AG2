import React, { useState } from 'react';
import { GoogleIcon } from './icons/GoogleIcon';
import { loginWithEmail, signupWithEmail, loginWithGoogle, sendPasswordReset } from '../services/firebase';
import { LabFlaskIcon } from './icons/LabFlaskIcon';
import { PrivacyModal, ContactModal } from './LegalModals';

const VoiceWaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
  </svg>
);

const DnaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H5.625c-.621 0-1.125.504-1.125 1.125v1.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-1.75c0-.621-.504-1.125-1.125-1.125Z" />
  </svg>
);

const NudgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const handleGoogleButtonClick = async () => {
    setAuthError('');
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setAuthError(error.message || "An error occurred during Google Sign-In.");
    }
  };

  const renderAuthForm = () => {
    switch (authMode) {
        case 'signup':
            return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">Create Your Account</h2>
                        <p className="text-gray-500 text-sm font-medium">Join our leadership practice community.</p>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); signupWithEmail(email, password).catch(err => setAuthError(err.message)); }} className="space-y-4">
                        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-gray-200 text-base focus:ring-4 focus:ring-black/5 focus:border-black transition-all outline-none" required />
                        <input type="password" placeholder="Create Password" onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-gray-200 text-base focus:ring-4 focus:ring-black/5 focus:border-black transition-all outline-none" required />
                        {authError && <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{authError}</div>}
                        <button type="submit" className="w-full bg-black text-white font-black py-4 px-4 rounded-2xl shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">Start My Profile</button>
                    </form>
                    <p className="text-center text-gray-400 mt-8 text-sm font-medium">Already registered? <button onClick={() => setAuthMode('login')} className="font-black text-black hover:underline">Sign In</button></p>
                </div>
            );
        case 'reset':
            return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">Reset Your Password</h2>
                        <p className="text-gray-500 text-sm font-medium">We'll send a secure link to your email.</p>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); sendPasswordReset(email).then(() => setSuccessMessage("Check your inbox")).catch(err => setAuthError(err.message)); }} className="space-y-4">
                        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-gray-200 text-base focus:ring-4 focus:ring-black/5 focus:border-black transition-all outline-none" required />
                        {authError && <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{authError}</div>}
                        <button type="submit" className="w-full bg-black text-white font-black py-4 px-4 rounded-2xl shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">Send Reset Link</button>
                    </form>
                    <p className="text-center text-gray-400 mt-8 text-sm font-medium"><button onClick={() => setAuthMode('login')} className="font-black text-black hover:underline">Return to Sign In</button></p>
                </div>
            );
        default:
            return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">Welcome to the Studio</h2>
                        <p className="text-gray-500 text-sm font-medium">Continue your leadership development journey.</p>
                    </div>
                    {successMessage && <p className="text-emerald-600 text-center mb-6 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-100 font-bold">{successMessage}</p>}
                    {authError && <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 mb-6">{authError}</div>}
                    <form onSubmit={(e) => { e.preventDefault(); loginWithEmail(email, password).catch(err => setAuthError(err.message)); }} className="space-y-4">
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-gray-200 text-base focus:ring-4 focus:ring-black/5 focus:border-black transition-all outline-none font-medium" required />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-gray-200 text-base focus:ring-4 focus:ring-black/5 focus:border-black transition-all outline-none font-medium" required />
                        <div className="flex justify-end"><button type="button" onClick={() => setAuthMode('reset')} className="text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-widest">Forgot your password?</button></div>
                        <button type="submit" className="w-full bg-black text-white font-black py-4 px-4 rounded-2xl shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">Enter Studio</button>
                    </form>
                    <div className="my-10 flex items-center"><div className="flex-grow border-t border-gray-100"></div><span className="mx-4 text-gray-300 text-[10px] font-black uppercase tracking-[0.3em]">Institutional Sign-In</span><div className="flex-grow border-t border-gray-100"></div></div>
                    <button onClick={handleGoogleButtonClick} className="w-full flex items-center justify-center gap-4 bg-white text-gray-900 font-black py-4 px-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] uppercase tracking-widest text-xs"><GoogleIcon className="w-4 h-4 shrink-0" />Continue with Google</button>
                    <p className="text-center text-gray-400 mt-10 text-sm font-medium">New to Skill Builder? <button onClick={() => setAuthMode('signup')} className="font-black text-black hover:underline">Sign Up</button></p>
                </div>
            );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-white overflow-x-hidden">
        <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

        {/* Brand Side */}
        <div className="w-full lg:flex-1 bg-gray-50 flex flex-col justify-center px-8 py-16 lg:px-24 border-r border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-20"></div>
            
            <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-12 relative z-10">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                        <VoiceWaveIcon />
                        Leadership Studio
                    </div>
                    <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-gray-900 leading-[0.9] text-balance">
                        Practice the <span className="text-gray-400">conversations</span> that matter.
                    </h2>
                    <p className="text-xl font-bold text-gray-500 leading-tight max-w-md">
                        Every journey begins with a diagnostic analysis. Our adaptive studio builds your capability through deep, realistic roleplays.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white rounded-[2rem] border border-gray-200 shadow-sm space-y-4 group hover:border-black transition-all duration-500 text-left">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
                            <VoiceWaveIcon />
                        </div>
                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">Diagnostic Conversations</h4>
                        <p className="text-gray-500 text-xs font-medium leading-relaxed">
                            Start with a deep analysis of your current judgment through a realistic stakeholders simulation.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-[2rem] border border-gray-200 shadow-sm space-y-4 group hover:border-black transition-all duration-500 text-left">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
                            <DnaIcon />
                        </div>
                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">Adaptive Mastery</h4>
                        <p className="text-gray-500 text-xs font-medium leading-relaxed">
                            Personalized learning that evolves with every interaction, building a rich map of your leadership patterns.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-[2rem] border border-gray-200 shadow-sm space-y-4 group hover:border-black transition-all duration-500 text-left">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
                            <NudgeIcon />
                        </div>
                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">Targeted Micro-Skills</h4>
                        <p className="text-gray-500 text-xs font-medium leading-relaxed">
                            Practice the exact behaviors needed next, based on evidence from your prior conversations.
                        </p>
                    </div>

                    <div className="p-6 bg-black rounded-[2rem] shadow-xl space-y-4 flex flex-col justify-center text-left">
                        <p className="text-white text-xs font-bold leading-relaxed italic">
                            "True leadership is an ecosystem to be cultivated through experience, not a machine to be tuned by a course."
                        </p>
                    </div>
                </div>

                <div className="pt-8 flex flex-col gap-4 text-left">
                    <div className="h-px w-12 bg-gray-200"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">
                        Inspired by the Gardener's Mindset
                    </p>
                    <p className="text-[9px] font-bold text-gray-400">
                        gardenersnotmechanics.com
                    </p>
                </div>
            </div>
        </div>

        {/* Auth Side */}
        <div className="w-full lg:flex-1 bg-white flex flex-col items-center justify-center px-6 py-12 lg:py-0">
            <div className="max-w-md w-full flex flex-col h-full justify-center">
                <div className="flex-grow flex flex-col justify-center">
                    <div className="mb-12 flex justify-center lg:justify-start">
                        <div className="flex items-center gap-3">
                             <LabFlaskIcon className="w-8 h-8 text-black" />
                             <h1 className="text-sm font-black tracking-[0.2em] uppercase text-gray-900">Skill Builder Studio</h1>
                        </div>
                    </div>
                    {renderAuthForm()}
                </div>
                
                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center lg:justify-start gap-8 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                    <button onClick={() => setShowPrivacy(true)} className="hover:text-black transition-colors">Security</button>
                    <button onClick={() => setShowContact(true)} className="hover:text-black transition-colors">Inquiry</button>
                </div>
            </div>
        </div>
    </div>
  );
};
