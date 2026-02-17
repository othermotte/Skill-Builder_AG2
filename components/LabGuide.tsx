import React from 'react';

interface LabGuideProps {
  onClose: () => void;
}

export const LabGuide: React.FC<LabGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <button 
          onClick={onClose}
          className="fixed top-6 right-6 p-2 bg-gray-100 hover:bg-black hover:text-white rounded-full transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-16">
          <header className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              The Methodology
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gray-900 leading-[0.9]">
              How to get the <span className="text-gray-400">best</span> out of the Studio.
            </h1>
            <p className="text-xl font-medium text-gray-500 max-w-2xl leading-relaxed">
              Leadership Skill Builder isn't a course. It's a high-fidelity environment for human interaction. Here is how to navigate the cycle.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xl">1</div>
              <h3 className="text-2xl font-black text-gray-900">Experience</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Enter a <strong>Realistic Scenario</strong>. Speak naturally as you would in real life. The AI Facilitator is programmed to probe your reasoning—don't just give the "right" answer, share your actual thinking.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-black text-xl">2</div>
              <h3 className="text-2xl font-black text-gray-900">Feedback</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                The system analyzes your transcript against <strong>5 Essential Capabilities</strong>. You'll receive a rubric score and evidence-based justifications of how your judgment showed up.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl">3</div>
              <h3 className="text-2xl font-black text-gray-900">Focused Practice</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Instead of generic training, you receive a <strong>Micro-Skill Snapshot</strong>. This is a targeted behavioral nudge tailored to the gaps detected in your last conversation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-xl">4</div>
              <h3 className="text-2xl font-black text-gray-900">Reflection</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                After a quick practice loop, reflect on whether you successfully applied the micro-skill. This steady progress builds <strong>Leadership DNA</strong> over time.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-[3rem] p-10 md:p-14 border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-8">Interaction Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">1</div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Starting the Conversation</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">Tap the microphone icon to start the conversation. The AI expects you to speak first. Once live, the conversation flows naturally back and forth—no need to tap after every response.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">2</div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Ending the Session</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">To end the session, you <strong>must tap the square icon</strong>. You can do this at any point if you feel you've shared enough, or when the Facilitator indicates they have sufficient information.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">3</div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Your Adaptive History</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">The Studio adapts based on every conversation you have, creating a learning experience that grows with you. Visit your History anytime to pick up where you left off.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 flex justify-center">
            <button 
              onClick={onClose}
              className="bg-black text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              Enter the Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
