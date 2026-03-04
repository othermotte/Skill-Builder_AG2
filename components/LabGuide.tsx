import React from 'react';

interface LabGuideProps {
  onClose: () => void;
}

const CapabilityIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm shrink-0">
    {children}
  </div>
);

export const LabGuide: React.FC<LabGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 relative">
        <button
          onClick={onClose}
          className="fixed top-6 right-6 p-2 bg-gray-100 hover:bg-black hover:text-white rounded-full transition-all z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-24">
          <header className="space-y-6 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em]">
              The Learner Journey
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gray-900 leading-[0.9]">
              Practice-led leadership development.
            </h1>
            <p className="text-xl font-medium text-gray-500 max-w-2xl mx-auto leading-relaxed pt-4">
              It doesn't try to tell you what kind of leader to be. It helps you become <strong className="text-gray-900">more effective than you were before</strong> — one situation, one skill, one conversation at a time.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 md:order-1 space-y-6">
              <h2 className="text-3xl font-black text-gray-900">Beyond Traditional Training</h2>
              <p className="text-gray-500 font-medium leading-relaxed text-lg">
                Most leadership development talks about skills. Skill Builder helps people <strong>build them</strong>. No generic courses. No one-size-fits-all pathways. Just deliberate practice, shaped around how you actually lead.
              </p>
            </div>
            <div className="order-1 md:order-2 bg-gray-50 rounded-[2rem] p-8 md:p-12 border border-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.315 48.315 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-[3rem] p-10 md:p-16 lg:p-20 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-black text-white">5 Essential Capabilities for the AI Age</h2>
                <p className="text-gray-400 font-medium text-lg">
                  Skill Builder evaluates your interactions against core modern leadership capability areas, providing detailed explanations of what showed up in your responses, not just numerical scores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Adaptive Mindset', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /> },
                  { name: 'Cognitive & Analytical', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.487 1.508 1.333 1.508 2.316V18" /> },
                  { name: 'Social & Interpersonal', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /> },
                  { name: 'Ethics, Integrity & Values', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97z" /> },
                  { name: 'Change Leadership', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /> }
                ].map((cap, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <CapabilityIcon>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                        {cap.icon}
                      </svg>
                    </CapabilityIcon>
                    <span className="font-bold text-sm text-white">{cap.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 bg-gray-50 rounded-[2rem] p-8 md:p-12 border border-gray-100 flex items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 200 100" className="w-full text-blue-600">
                <path d="M 20 50 C 60 50, 60 20, 100 20 L 180 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <path d="M 20 50 C 60 50, 60 80, 100 80 L 180 80" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" />
                <circle cx="20" cy="50" r="8" fill="currentColor" />
                <circle cx="180" cy="20" r="8" fill="currentColor" />
                <circle cx="180" cy="80" r="8" fill="#9ca3af" />
              </svg>
            </div>
            <div className="order-1 space-y-6">
              <h2 className="text-3xl font-black text-gray-900">Personalization at Scale</h2>
              <p className="text-gray-500 font-medium leading-relaxed text-lg">
                Nothing after your first scenario is generic. The system carries forward an understanding of how you think. Two leaders starting at the same place can end up on entirely different learning journeys based on their unique capability gaps.
              </p>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto space-y-8 pt-8">
            <h2 className="text-3xl font-black text-gray-900">Designed for Real Work</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pause Anytime</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revisit Feedback</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repeat Deliberately</span>
              </div>
            </div>
            <p className="text-gray-500 font-medium">No pressure to perform, just steady improvement on your own schedule.</p>
          </div>

          <div className="pt-12 flex justify-center pb-20">
            <button
              onClick={onClose}
              className="bg-black text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
