import type { UserProfile } from "../../types";

interface Props {
  userEmail: string;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onClose: () => void;
  onCompleteProfile?: () => void;
}

export default function SettingsPanel({ userEmail, userProfile, onSignOut, onClose, onCompleteProfile }: Props) {
  // Format completeness (assumes value is 0-100 from DB based on User feedback)
  const completeness = userProfile ? Math.max(0, Math.min(100, Math.round(userProfile.profileCompleteness || 0))) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-border-light overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border-light shrink-0">
          <h3 className="text-base font-bold">Account Settings</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-black">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {/* User Account Info */}
          <section>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Identity</p>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-neutral-100 flex items-center justify-center premium-gradient text-white">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
              <div>
                <p className="text-base font-bold text-black">{userEmail}</p>
                <p className="text-[10px] text-neutral-500 font-medium">ET Concierge Member</p>
              </div>
            </div>
          </section>

          {/* Profile Overview */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Financial Profile</p>
              </div>
              
              {userProfile && (
                <span className="text-xs font-semibold text-neutral-500">
                  Completeness: <span className="text-gradient font-black">{completeness}%</span>
                </span>
              )}
            </div>

            {!userProfile ? (
              <div className="p-6 border border-dashed border-neutral-300 rounded-xl bg-neutral-50 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-neutral-300 text-3xl mb-2">analytics</span>
                <p className="text-sm font-medium text-neutral-500 mb-1">No Profile Data Found</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Start conversing with the ET Concierge in Advisory mode to automatically build your financial profile.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full premium-gradient-horizontal transition-all duration-1000 ease-out"
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                {/* Grid Attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-neutral-50 border border-black/5 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Occupation</span>
                    <span className="text-sm font-semibold text-black break-words">
                      {userProfile.occupation || "Not specified"}
                    </span>
                  </div>
                  
                  <div className="bg-neutral-50 border border-black/5 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Age Bracket</span>
                    <span className="text-sm font-semibold capitalize text-black">
                      {userProfile.ageBracket || "Not specified"}
                    </span>
                  </div>

                  <div className="bg-neutral-50 border border-black/5 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Risk Appetite</span>
                    <span className="text-sm font-semibold capitalize text-black">
                      {userProfile.riskAppetite || "Not specified"}
                    </span>
                  </div>
                </div>

                {/* Lists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-black/10 p-4 rounded-xl">
                    <span className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
                      <span className="material-symbols-outlined text-[14px]">flag</span>
                      Financial Goals
                    </span>
                    {userProfile.financialGoals && userProfile.financialGoals.length > 0 ? (
                      <ul className="space-y-2">
                        {userProfile.financialGoals.map((g, i) => {
                          const text = typeof g === "string" ? g : (g as Record<string, string>).S || String(g);
                          return (
                            <li key={i} className="text-sm text-black flex items-start gap-2">
                              <span className="text-gradient font-black mt-[2px]">•</span> <span>{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">None identified yet</p>
                    )}
                  </div>

                  <div className="bg-white border border-black/10 p-4 rounded-xl">
                    <span className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
                      <span className="material-symbols-outlined text-[14px]">favorite</span>
                      Interests
                    </span>
                    {userProfile.topicsOfInterest && userProfile.topicsOfInterest.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userProfile.topicsOfInterest.map((it, i) => {
                          const text = typeof it === "string" ? it : (it as Record<string, string>).S || String(it);
                          return (
                            <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md font-medium">
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">None identified yet</p>
                    )}
                  </div>
                </div>
                
                {/* Meta details */}
                <div className="flex justify-between items-center">
                  {onCompleteProfile && userProfile && completeness < 100 && (
                  <button 
                    onClick={() => {
                      onClose();
                      onCompleteProfile();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg premium-gradient-horizontal text-white text-[11px] font-bold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    Complete Profile
                  </button>
                )}
                   <p className="text-[10px] text-neutral-400 font-medium tracking-wide">
                     Last updated: {new Date(userProfile.lastUpdated).toLocaleDateString()}
                   </p>
                </div>
              </div>
            )}
          </section>

          <hr className="border-border-light" />

          {/* Action Area */}
          <section className="flex justify-start">
            <button
              onClick={onSignOut}
              className="border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 focus:ring-4 focus:ring-red-100 font-bold py-2 px-5 rounded-lg transition-colors text-xs"
            >
              Sign Out Securely
            </button>
          </section>

        </div>
      </div>
    </div>
  );
}
