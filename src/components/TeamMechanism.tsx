import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, Users, Crown, Zap } from 'lucide-react';
import { useNotification } from './NotificationProvider';
import { auth, db, doc, onSnapshot } from '../lib/firebase';
import { UserProfile } from '../types';
import { vibrateLight, vibrateSuccess } from '../lib/haptics';

interface TeamMechanismProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
  key?: string;
}

export default function TeamMechanism({ onBack, onNavigate }: TeamMechanismProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [l1Members, setL1Members] = useState(10);
  const [l2Members, setL2Members] = useState(25);
  const [l3Members, setL3Members] = useState(50);
  const averageTaskProfit = 5;

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, []);

  const handleCopyLink = () => {
    vibrateSuccess();
    if (profile?.referralCode) {
      const domain = window.location.origin.includes('localhost') ? 'https://app.zalandopro.com' : window.location.origin;
      const link = `${domain}?ref=${profile.referralCode}`;
      
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link)
          .then(() => showNotification('Invitation link copied successfully!', { type: 'success' }))
          .catch(() => fallbackCopyTextToClipboard(link));
      } else {
        fallbackCopyTextToClipboard(link);
      }
    } else {
      showNotification('Referral code not found.', { type: 'error' });
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showNotification('Invitation link copied successfully!', { type: 'success' });
    } catch (err) {
      showNotification('Failed to copy link.', { type: 'error' });
    }
    document.body.removeChild(textArea);
  };

  const dailyCalculation = 
    (l1Members * averageTaskProfit * 0.05) + 
    (l2Members * averageTaskProfit * 0.03) + 
    (l3Members * averageTaskProfit * 0.01);

  const levels = [
    { level: 1, rate: '5%', desc: 'Directly invited members', bg: 'bg-[#0a84ff]/10', color: '#0a84ff', icon: Crown },
    { level: 2, rate: '3%', desc: 'Invited by your Level 1 members', bg: 'bg-[#30d158]/10', color: '#30d158', icon: Users },
    { level: 3, rate: '1%', desc: 'Invited by your Level 2 members', bg: 'bg-[#bf5af2]/10', color: '#bf5af2', icon: Zap },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-[#F5F3FF] dark:bg-black pb-24 font-sans overflow-y-auto"
    >
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="safe-top sticky top-0 z-50 bg-[#F7F5FF]/80 dark:bg-black/60 border-b border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center justify-between transition-all"
      >
        <button 
          onClick={() => { vibrateLight(); onBack(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">Team Mechanism</span>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-8 pt-6">
        
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pl-2"
        >
          <p className="text-sm font-semibold text-[#0a84ff] mb-2 tracking-wide">TEAM MECHANISM</p>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
            Build your team. <br /> Grow your empire.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Earn unlimited passive income daily through your global network's task completions. Share your link to get started.
          </p>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className="mt-6 w-full bg-[#0a84ff] text-white rounded-full px-6 py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#0a84ff]/30 transition-transform"
            style={{ backgroundColor: '#0a84ff' }}
          >
            <Share2 className="w-5 h-5" />
            Share Invitation Link
          </motion.button>
        </motion.div>

        {/* 3-Level Grid */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-black dark:text-white mb-4 pl-2 tracking-tight">Commission Hierarchy.</h2>
          <div className="flex flex-col gap-4">
            {levels.map((lvl, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
                className={`rounded-[2rem] p-6 bg-[#f5f5f7] dark:bg-[#1c1c1e] flex items-center gap-4 relative overflow-hidden`}
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lvl.bg, color: lvl.color }}
                >
                  <lvl.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Level {lvl.level}</p>
                  <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">{lvl.rate} Rebate</h3>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{lvl.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Calculator */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="rounded-[2rem] bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] p-6 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0a84ff]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="mb-6 relative z-10">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Earnings Simulator.</h2>
            <p className="text-xs text-gray-400 font-medium">Forecast your daily passive income.</p>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="space-y-6">
              {[
                { label: 'Level 1 Team', val: l1Members, set: setL1Members, max: 100, color: '#0a84ff' },
                { label: 'Level 2 Team', val: l2Members, set: setL2Members, max: 500, color: '#30d158' },
                { label: 'Level 3 Team', val: l3Members, set: setL3Members, max: 1000, color: '#bf5af2' },
              ].map((slider, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">{slider.label}</span>
                    <span className="text-sm font-bold" style={{ color: slider.color }}>{slider.val} users</span>
                  </div>
                  <input 
                    type="range" min="0" max={slider.max} value={slider.val} 
                    onChange={(e) => { vibrateLight(); slider.set(Number(e.target.value)); }} 
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer" 
                    style={{ accentColor: slider.color }}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col bg-black/40 rounded-[1.5rem] p-5 border border-white/10 backdrop-blur-md">
              <p className="text-xs font-semibold text-gray-400 mb-1">Estimated Daily Income</p>
              <div className="text-4xl font-bold tracking-tight text-[#30d158] mb-4 drop-shadow-md">
                ${dailyCalculation.toFixed(2)}
              </div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Estimated Monthly (30D)</p>
              <div className="text-2xl font-bold tracking-tight text-white">
                ${(dailyCalculation * 30).toFixed(2)}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
