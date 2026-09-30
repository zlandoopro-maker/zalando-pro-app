import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Send,
  ChevronRight,
  User,
  Phone,
  Shield,
  LogOut,
  Settings,
  HelpCircle,
  Clock,
  Gift,
  Info,
  Share,
  Instagram,
  Youtube,
  Globe,
  XCircle
} from 'lucide-react';
import { UserProfile, Screen } from '../types';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc } from '../lib/firebase';
import { signOut } from '../lib/firebase';
import Logo from './Logo';
import { useNotification } from './NotificationProvider';
import { vibrateLight } from '../lib/haptics';
import { TIERS } from '../lib/tiers';

const PlanTimer = ({ expiry }: { expiry?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiry) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const expiryTime = new Date(expiry).getTime();
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  if (!timeLeft) return null;

  return (
    <div className="bg-gradient-to-br from-[#FFE884] to-[#F1B12E] dark:from-[#DCA316] dark:to-[#B47C02] px-2 py-0.5 rounded-md shadow-[0_2px_8px_rgba(241,177,46,0.3)] dark:shadow-none border border-white/50 dark:border-white/10 flex flex-col items-center min-w-[65px]">
      <span className="text-[7px] font-black uppercase text-amber-900 dark:text-blue-100 tracking-widest opacity-80">Time</span>
      <span className="text-[10px] font-black font-mono text-amber-950 dark:text-amber-50 tracking-tighter leading-tight">{timeLeft}</span>
    </div>
  );
};

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" />
  </svg>
);

interface AccountProps {
  onNavigate: (screen: Screen) => void;
  key?: string;
}

export default function Account({ onNavigate }: AccountProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [accountProfileUrl, setAccountProfileUrl] = useState('/badges/profile_default.png');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWithdrawalDisabled, setIsWithdrawalDisabled] = useState(false);
  const [showSocialHub, setShowSocialHub] = useState(false);
  const [telegramLink, setTelegramLink] = useState('https://t.me/');
  const [instagramLink, setInstagramLink] = useState('https://instagram.com/');
  const [youtubeLink, setYoutubeLink] = useState('https://youtube.com/');
  const [apkUrl, setApkUrl] = useState('/app.apk');

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(parseUserProfile(docSnap.data()) as UserProfile);
      } else {
        // Profile doesn't exist yet — give auto-healer time before force logout
        console.warn("User document not found in Firestore, waiting for auto-heal...");
        setTimeout(async () => {
          try {
            const { getDoc } = await import('../lib/firebase');
            const recheck = await getDoc(doc(db, 'users', auth.currentUser!.uid));
            if (!recheck.exists()) {
              showNotification("User profile not found. Please log in again.", { type: 'error' });
              signOut(auth).then(() => {
                onNavigate('auth');
              });
            }
          } catch (e) {
            // Silently fail — snapshot listener will pick up the doc if it appears
          }
        }, 3000);
      }
    }, (error) => {
      try { handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`); } catch (e) { }
    });

    const checkAvailability = () => {
      // Calculate IST (UTC+5:30)
      const now = new Date();
      const istTime = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
      const day = istTime.getDay();
      const hour = istTime.getHours();
      return (day >= 1 && day <= 5) && (hour >= 10 && hour < 22);
    };

    setIsWithdrawalDisabled(!checkAvailability());

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.telegramLink) setTelegramLink(data.telegramLink);
        if (data.instagramLink) setInstagramLink(data.instagramLink);
        if (data.youtubeLink) setYoutubeLink(data.youtubeLink);
        if (data.accountProfileUrl) setAccountProfileUrl(data.accountProfileUrl);
        if (data.apkUrl) setApkUrl(data.apkUrl);
      }
    });

    const interval = setInterval(() => {
      setIsWithdrawalDisabled(!checkAvailability());
    }, 60000);

    return () => {
      unsubUser();
      unsubSettings();
      clearInterval(interval);
    };
  }, [auth.currentUser]);

  const handleLogout = async () => {
    vibrateLight();
    await signOut(auth);
    onNavigate('intro1');
  };

  const handleDownloadApp = () => {
    vibrateLight();
    window.open(apkUrl, '_blank');
  };

  const getShortPlanName = (id?: string) => {
    if (!id || id === 'none') return 'No Plan';
    const plans: Record<string, string> = {
      starter: 'Starter',
      trainee: 'Trainee',
      general: 'General',
      senior: 'Senior',
      regional: 'Regional',
      reg_gen: 'R.G.'
    };
    return plans[id] || id.split('_')[0].toUpperCase();
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-[#0B0C10] p-8">
        <p className="text-rose-500 font-bold uppercase tracking-widest text-[10px] mb-4">Authentication Error</p>
        <p className="text-slate-500 text-sm mb-8 text-center">Please log in to view your account details.</p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-[#0B0C10] p-8">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Syncing with Blockchain...</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase"
        >
          Reload
        </button>
      </div>
    );
  }

  const currentTier = TIERS.find(t => t.id === profile.currentPlan);
  const tierDisplayName = currentTier?.name || 'Trainee Manager';
  const daysLeftText = (() => {
    if (profile.planExpiry) {
      const expiryTime = new Date(profile.planExpiry).getTime();
      const now = new Date().getTime();
      const diff = expiryTime - now;
      if (diff > 0) {
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return `${days} Days`;
      }
    }
    return '77 Days';
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-full bg-[#F8F9FD] dark:bg-[#0B0C10] pb-[calc(8rem+env(safe-area-inset-bottom,0px))] transition-colors duration-300 flex flex-col shrink-0"
    >
      {/* 1. TOP HEADER */}
      <div className="w-full pt-9 pb-2 px-5 flex items-center justify-between relative">
        <div className="w-9 h-9 rounded-full border border-[#6B76F5]/40 bg-white dark:bg-[#1C1E24] flex items-center justify-center text-[#5C67DE] dark:text-indigo-400 shadow-xs">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="9" y1="8.5" x2="9" y2="11.5" strokeWidth="2.2" />
            <line x1="15" y1="8.5" x2="15" y2="11.5" strokeWidth="2.2" />
            <path d="M8 15c1 1.5 2.5 2 4 2s3-.5 4-2" strokeWidth="1.8" />
          </svg>
        </div>
        <h1 className="text-[24px] font-black italic text-[#1E293B] dark:text-white tracking-tight absolute left-1/2 -translate-x-1/2 font-['Inter',sans-serif]">
          Account
        </h1>
        <div className="w-9"></div>
      </div>

      {/* 2. USER PROFILE AREA */}
      <div className="w-full px-5 my-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Asymmetrical Zalando Pebble Logo */}
          <div className="relative w-[66px] h-[62px] flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Zalando Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[13px] text-[#94A3B8] font-normal leading-none font-['Inter',sans-serif]">Hello</span>
            <span className="text-[25px] font-black italic text-[#4F5DE4] dark:text-indigo-400 leading-none tracking-tight mt-1 font-['Inter',sans-serif]">
              {profile.displayName || 'Ajay'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center">
          <span className="text-[22px] font-black text-[#22C55E] tracking-tight leading-none font-['Inter',sans-serif]">
            {daysLeftText}
          </span>
          <div className="mt-1 px-3.5 py-0.5 rounded-full border border-[#FACC15] dark:border-amber-500/40 bg-[#FFFDF0] dark:bg-amber-950/30 text-[#D97706] dark:text-amber-400 text-[11px] font-semibold tracking-wide text-center font-['Inter',sans-serif]">
            {tierDisplayName}
          </div>
        </div>
      </div>

      {/* 3. MAIN ACCOUNT STATISTICS CARD */}
      <div className="mx-4 bg-white dark:bg-[#15171B] rounded-[24px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left Column */}
          <div className="flex flex-col items-center justify-between space-y-5 pr-2">
            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 tracking-tight font-['Inter',sans-serif]">Invitation Code</p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 underline underline-offset-2 mt-1.5 font-['Inter',sans-serif]">
                {profile.referralCode || '80025437'}
              </p>
            </div>

            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 leading-tight tracking-tight font-['Inter',sans-serif]">
                Today's Referral<br />Bonus
              </p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 mt-1.5 font-['Inter',sans-serif]">
                {profile.hideBalance ? '***' : `$${Number(profile.todayTeamEarnings || 0).toFixed(2)}`}
              </p>
            </div>

            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 leading-tight tracking-tight font-['Inter',sans-serif]">
                Today's Task<br />Earnings
              </p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 mt-1.5 font-['Inter',sans-serif]">
                {profile.hideBalance ? '***' : `$${Number(profile.todayTaskEarnings || 0).toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col items-center justify-between space-y-5 pl-2">
            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 tracking-tight font-['Inter',sans-serif]">Balance</p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 mt-1.5 font-['Inter',sans-serif]">
                {profile.hideBalance ? '***' : profile.balance !== undefined && profile.balance % 1 === 0 ? `$${profile.balance}` : `$${Number(profile.balance || 0).toFixed(2)}`}
              </p>
            </div>

            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 leading-tight tracking-tight font-['Inter',sans-serif]">
                Today's Team<br />Earnings
              </p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 mt-1.5 font-['Inter',sans-serif]">
                {profile.hideBalance ? '***' : `$${Number(profile.todayTeamEarnings || 0).toFixed(2)}`}
              </p>
            </div>

            <div>
              <p className="text-[15px] font-black italic text-[#2D3748] dark:text-slate-200 leading-tight tracking-tight font-['Inter',sans-serif]">Total Earnings</p>
              <p className="text-[15px] font-semibold text-[#64748B] dark:text-slate-400 mt-1.5 font-['Inter',sans-serif]">
                {profile.hideBalance ? '***' : `$${Number(profile.totalEarnings || 0).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTION SECTION */}
      <div className="mx-4 mt-4 mb-6 bg-white dark:bg-[#15171B] rounded-[22px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Withdraw */}
          <button
            onClick={() => onNavigate('withdrawal')}
            disabled={isWithdrawalDisabled}
            className="flex flex-col items-center group active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm" style={{background: 'radial-gradient(circle at 70% 30%, #f472b6 0%, #c084fc 35%, #818cf8 65%, #a855f7 100%)'}}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                {/* Solid filled upward arrow */}
                <path d="M17 5L23 13H20V17H14V13H11L17 5Z" fill="white"/>
                {/* Horizontal tray bar */}
                <rect x="5" y="18" width="24" height="4" rx="2" fill="white"/>
                {/* Left drooping leg */}
                <path d="M7 22V27" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
                {/* Center drooping leg */}
                <path d="M17 22V27" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
                {/* Right drooping leg */}
                <path d="M27 22V27" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[13px] font-black italic text-[#2D3748] dark:text-slate-200 mt-2 text-center tracking-tight font-['Inter',sans-serif]">
              Withdraw
            </span>
          </button>

          {/* Deposit */}
          <button
            onClick={() => onNavigate('deposit')}
            className="flex flex-col items-center group active:scale-95 transition-transform"
          >
            {/* No circle bg — floating bag like reference */}
            <div className="w-14 h-14 flex items-center justify-center">
              <svg width="60" height="58" viewBox="0 0 60 58" fill="none">
                <defs>
                  <radialGradient id="dep-bag" cx="35%" cy="70%" r="65%" gradientUnits="objectBoundingBox">
                    <stop offset="0%" stopColor="#e879a0"/>
                    <stop offset="50%" stopColor="#b94fd4"/>
                    <stop offset="100%" stopColor="#7c22c8"/>
                  </radialGradient>
                </defs>
                {/* Crown/knot — dark rounded hat shape */}
                <path d="M22 21C22 15.5 38 15.5 38 21" fill="none" stroke="#3b0764" strokeWidth="1"/>
                <ellipse cx="30" cy="21.5" rx="8.5" ry="5" fill="#3b0764"/>
                {/* Bag body — large round shape */}
                <path d="M30 25C18 25 11 32 10 41C9 49 15 56 30 56C45 56 51 49 50 41C49 32 42 25 30 25Z" fill="url(#dep-bag)"/>
                {/* Large bold $ sign */}
                <text x="30" y="45" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Arial,sans-serif">$</text>
                {/* Large 4-pointed sparkle star — top right */}
                <path d="M48 8L49.5 13.5L55 15L49.5 16.5L48 22L46.5 16.5L41 15L46.5 13.5Z" fill="#9333ea"/>
                {/* Small 4-pointed sparkle star */}
                <path d="M42 2L43 5.5L46.5 6.5L43 7.5L42 11L41 7.5L37.5 6.5L41 5.5Z" fill="#a855f7"/>
              </svg>
            </div>
            <span className="text-[13px] font-black italic text-[#2D3748] dark:text-slate-200 mt-1 text-center tracking-tight font-['Inter',sans-serif]">
              Deposit
            </span>
          </button>

          {/* Transfer */}
          <button
            onClick={() => onNavigate('transfer')}
            className="flex flex-col items-center group active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 flex items-center justify-center">
              <img src="/transfer_icon.png" alt="Transfer" className="w-14 h-14 object-contain drop-shadow-sm" />
            </div>
            <span className="text-[13px] font-black italic text-[#2D3748] dark:text-slate-200 mt-1 text-center tracking-tight font-['Inter',sans-serif]">
              Transfer
            </span>
          </button>
        </div>
      </div>

      {/* Menu Options */}
      <div className="mx-4 bg-white dark:bg-[#15171B] rounded-[2rem] border border-slate-100 dark:border-slate-800/50 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-none divide-y divide-slate-50 dark:divide-slate-800/50 transition-colors duration-300 relative z-10">
        {[
          { icon: <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />, label: 'Personal Information', screen: 'personal-info' },
          { icon: <Phone className="w-5 h-5 text-green-500 dark:text-green-400" />, label: 'Linked Mobile Number', screen: 'linked-mobile' },
          { icon: <Clock className="w-5 h-5 text-purple-500 dark:text-purple-400" />, label: 'Transaction History', screen: 'orders' },
          { icon: <Globe className="w-5 h-5 text-sky-500 dark:text-sky-400" />, label: 'Join Social Hub', isSocialHub: true },
          { icon: <ArrowDownToLine className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />, label: 'Download App', isDownload: true },
          { icon: <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />, label: 'Security Center', screen: 'security-center' },
          { icon: <HelpCircle className="w-5 h-5 text-teal-500 dark:text-teal-400" />, label: 'Help Support', screen: 'help-chat' },
          { icon: <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />, label: 'Settings', screen: 'settings' },
          { icon: <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />, label: 'About', screen: 'about' },
          ...(profile.isAdmin ? [{ icon: <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />, label: 'Admin Hub', screen: 'admin' as Screen }] : [])
        ].map((item, i) => (
          <div key={i} className="flex flex-col">
            <button
              onClick={() => {
                if ((item as any).isSocialHub) setShowSocialHub(true);
                else if ((item as any).isDownload) handleDownloadApp();
                else if ((item as any).screen) onNavigate((item as any).screen as Screen);
              }}
              className="w-full p-5 flex items-center justify-between group active:bg-slate-50 dark:active:bg-[#1C1E24] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1C1E24] group-hover:bg-white dark:group-hover:bg-[#252830] transition-colors">
                  {item.icon}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
              {(item as any).isDropdown ? (
                <ChevronRight className={`w-4 h-4 text-slate-300 dark:text-slate-500 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mx-4 mt-8 mb-4 p-5 w-[calc(100%-2rem)] flex items-center justify-center gap-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-transparent dark:border-rose-500/20 rounded-2xl font-black uppercase tracking-widest text-xs active:bg-rose-100 dark:active:bg-rose-500/20 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out Securely

      </button>

      <AnimatePresence>
        {showSocialHub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSocialHub(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1C1E24] rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowSocialHub(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
              <div className="flex flex-col items-center mt-2">
                <div className="w-16 h-16 bg-sky-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-sky-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Join Social Hub</h3>

                <div className="w-full space-y-3">
                  <button
                    onClick={() => window.open(telegramLink, '_blank')}
                    className="w-full flex justify-between items-center bg-[#E1F0FA] dark:bg-[#0088cc]/10 p-4 rounded-xl hover:opacity-90 active:scale-95 transition-all text-[#0088cc]"
                  >
                    <div className="flex items-center gap-3">
                      <TelegramIcon />
                      <span className="font-bold">Telegram</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>

                  <button
                    onClick={() => window.open(instagramLink, '_blank')}
                    className="w-full flex justify-between items-center bg-pink-50 dark:bg-pink-500/10 p-4 rounded-xl hover:opacity-90 active:scale-95 transition-all text-pink-600 dark:text-pink-400"
                  >
                    <div className="flex items-center gap-3">
                      <Instagram className="w-6 h-6" />
                      <span className="font-bold">Instagram</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>

                  <button
                    onClick={() => window.open(youtubeLink, '_blank')}
                    className="w-full flex justify-between items-center bg-red-50 dark:bg-red-500/10 p-4 rounded-xl hover:opacity-90 active:scale-95 transition-all text-red-600 dark:text-red-500"
                  >
                    <div className="flex items-center gap-3">
                      <Youtube className="w-6 h-6" />
                      <span className="font-bold">YouTube</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

