import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, Users, Crown, Zap, DollarSign, UserCheck, Award } from 'lucide-react';
import { useNotification } from './NotificationProvider';
import { auth, db, doc, onSnapshot, collection, query, where } from '../lib/firebase';
import { UserProfile, ReferralRecord } from '../types';
import { vibrateLight, vibrateSuccess } from '../lib/haptics';

interface TeamMechanismProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
  key?: string;
}

export default function TeamMechanism({ onBack, onNavigate }: TeamMechanismProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [l1Records, setL1Records] = useState<ReferralRecord[]>([]);
  const [l2Records, setL2Records] = useState<ReferralRecord[]>([]);
  const [l3Records, setL3Records] = useState<ReferralRecord[]>([]);
  
  // Calculator state
  const [simL1, setSimL1] = useState(10);
  const [simL2, setSimL2] = useState(25);
  const [simL3, setSimL3] = useState(50);
  const averageTaskProfit = 5;

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unsubProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    });

    // L1 Referrals
    const q1 = query(collection(db, 'referrals'), where('referrerId', '==', uid));
    const unsubL1 = onSnapshot(q1, (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      setL1Records(docs);
      if (docs.length > 0) setSimL1(docs.length);
    });

    // L2 Referrals
    const q2 = query(collection(db, 'referrals'), where('l2ReferrerId', '==', uid));
    const unsubL2 = onSnapshot(q2, (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      setL2Records(docs);
      if (docs.length > 0) setSimL2(docs.length);
    });

    // L3 Referrals
    const q3 = query(collection(db, 'referrals'), where('l3ReferrerId', '==', uid));
    const unsubL3 = onSnapshot(q3, (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      setL3Records(docs);
      if (docs.length > 0) setSimL3(docs.length);
    });

    return () => {
      unsubProfile();
      unsubL1();
      unsubL2();
      unsubL3();
    };
  }, []);

  const totalTeamMembers = l1Records.length + l2Records.length + l3Records.length;
  const totalTeamEarnings = [...l1Records, ...l2Records, ...l3Records].reduce((acc, curr) => acc + (curr.commissionEarned || 0), 0);

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
    (simL1 * averageTaskProfit * 0.10) + 
    (simL2 * averageTaskProfit * 0.05) + 
    (simL3 * averageTaskProfit * 0.02);

  const levels = [
    { level: 1, rate: '10%', members: l1Records.length, desc: 'Directly invited team members', bg: 'bg-[#0a84ff]/10', color: '#0a84ff', icon: Crown },
    { level: 2, rate: '5%', members: l2Records.length, desc: 'Invited by your Level 1 members', bg: 'bg-[#30d158]/10', color: '#30d158', icon: Users },
    { level: 3, rate: '2%', members: l3Records.length, desc: 'Invited by your Level 2 members', bg: 'bg-[#bf5af2]/10', color: '#bf5af2', icon: Zap },
  ];

  const allRecentMembers = [...l1Records, ...l2Records, ...l3Records]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-[#F5F3FF] dark:bg-black pb-24 font-sans overflow-y-auto"
    >
      {/* Sticky Header */}
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
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pl-2"
        >
          <p className="text-sm font-semibold text-[#0a84ff] mb-2 tracking-wide uppercase">Team Mechanism</p>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
            Build your team. <br /> Grow your empire.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Earn 10% (L1), 5% (L2), and 2% (L3) daily commissions through your global network's plan activations & task completions.
          </p>

          {/* Quick Real Stats Bar */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white dark:bg-[#1C1E24] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Team</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{totalTeamMembers} <span className="text-xs font-medium text-slate-400">members</span></p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1E24] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Team Earned</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">${(profile?.todayTeamEarnings || totalTeamEarnings).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className="mt-5 w-full bg-[#0a84ff] text-white rounded-full px-6 py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#0a84ff]/30 transition-transform"
            style={{ backgroundColor: '#0a84ff' }}
          >
            <Share2 className="w-5 h-5" />
            Share Invitation Link ({profile?.referralCode || '...'})
          </motion.button>
        </motion.div>

        {/* 3-Level Grid with Live Active Count */}
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
                className="rounded-[2rem] p-6 bg-white dark:bg-[#1c1c1e] flex items-center gap-4 relative overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lvl.bg, color: lvl.color }}
                >
                  <lvl.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level {lvl.level}</p>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {lvl.members} Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">{lvl.rate} Commission</h3>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{lvl.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Team Members List */}
        {allRecentMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] bg-white dark:bg-[#1c1c1e] p-6 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h2 className="text-xl font-bold text-black dark:text-white mb-4 tracking-tight">Referred Team Members</h2>
            <div className="space-y-3">
              {allRecentMembers.slice(0, 10).map((mem, idx) => (
                <div key={mem.id || idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-none">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{mem.inviteeName || 'Team Member'}</p>
                    <p className="text-xs text-slate-400 font-medium">Plan: {mem.planType || 'None'} • {new Date(mem.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+${(mem.commissionEarned || 0).toFixed(2)}</span>
                    <p className="text-[10px] font-semibold uppercase text-blue-500">{mem.status || 'active'}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
            <p className="text-xs text-gray-400 font-medium">Forecast your daily passive income based on team growth.</p>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="space-y-6">
              {[
                { label: 'Level 1 Team (10% Rebate)', val: simL1, set: setSimL1, max: 100, color: '#0a84ff' },
                { label: 'Level 2 Team (5% Rebate)', val: simL2, set: setSimL2, max: 500, color: '#30d158' },
                { label: 'Level 3 Team (2% Rebate)', val: simL3, set: setSimL3, max: 1000, color: '#bf5af2' },
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
