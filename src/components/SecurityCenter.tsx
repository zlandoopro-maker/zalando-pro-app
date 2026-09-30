import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Shield, Lock, Fingerprint, Eye, Activity, Loader2, X } from 'lucide-react';
import { auth, db, parseUserProfile } from '../lib/firebase';
import { doc, getDoc, updateDoc } from '../lib/firebase';
import { UserProfile } from '../types';
import { useNotification } from './NotificationProvider';

interface SecurityCenterProps {
  onBack: () => void;
  key?: string;
}

export default function SecurityCenter({ onBack }: SecurityCenterProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(parseUserProfile(docSnap.data()) as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleToggle = async (key: 'hideBalance' | 'biometricLogin') => {
    if (!profile || updating) return;

    const newValue = !profile[key];
    setUpdating(true);

    // Optimistic update
    setProfile({ ...profile, [key]: newValue });

    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, { [key]: newValue });
    } catch (error) {
      console.error(`Failed to update ${key}`, error);
      // Revert on failure
      setProfile({ ...profile, [key]: !newValue });
      showNotification('Failed to update settings. Please try again.', { type: 'error', title: 'UPDATE FAILED' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-white dark:bg-black z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  const securityItems = [
    {
      icon: Lock,
      title: 'Change Password',
      subtitle: 'Last updated 30 days ago',
      action: 'button',
      label: 'Update',
    },
    {
      icon: Fingerprint,
      title: 'Biometric Login',
      subtitle: 'Use Face ID or Fingerprint',
      action: 'toggle',
      key: 'biometricLogin' as const,
    },
    {
      icon: Eye,
      title: 'Hide Balance',
      subtitle: 'Mask balance on homescreen',
      action: 'toggle',
      key: 'hideBalance' as const,
    },
    {
      icon: Activity,
      title: 'Login Activity',
      subtitle: 'Review recent logins',
      action: 'view',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="relative min-h-screen bg-white dark:bg-black pb-24 font-sans overflow-y-auto"
    >
      {/* Header */}
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="safe-top sticky top-0 z-50 bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center justify-between transition-all"
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">Security Center</span>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-8 pt-6">

        {/* Hero */}
        <div className="pl-2">
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight leading-tight">
            Security Center. <br /> Your shield.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Manage your account security settings. We protect your data so you can focus on growing.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
            <Shield className="w-7 h-7 text-black dark:text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Account Secure</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Protection Level: High</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-black dark:text-white mb-1">Strict Security Policy</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Account permanently blocked for Timezone Tampering.</span> Any attempt to manipulate your device clock to bypass withdrawal locks will result in an immediate, permanent ban.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white mb-4 pl-2 tracking-tight">Settings.</h2>
          <div className="flex flex-col gap-4">
            {securityItems.map((item, idx) => (
              <div key={idx} className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{item.subtitle}</p>
                </div>
                {item.action === 'button' && (
                  <button className="text-xs font-bold text-black dark:text-white bg-black/5 dark:bg-white/10 px-4 py-2 rounded-full active:scale-95 transition-transform">
                    {item.label}
                  </button>
                )}
                {item.action === 'toggle' && item.key && (
                  <div
                    onClick={() => handleToggle(item.key!)}
                    className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${
                      profile?.[item.key] ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-transform ${
                      profile?.[item.key] ? 'right-1 bg-white dark:bg-black' : 'left-1 bg-white'
                    }`}></div>
                  </div>
                )}
                {item.action === 'view' && (
                  <button
                    onClick={() => setShowActivity(true)}
                    className="text-xs font-bold text-black dark:text-white bg-black/5 dark:bg-white/10 px-4 py-2 rounded-full active:scale-95 transition-transform"
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Activity Modal */}
      {showActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-[#1d1d1f] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-12 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black dark:text-white tracking-tight">Login Activity</h3>
              <button
                onClick={() => setShowActivity(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-black dark:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#f5f5f7] dark:bg-[#111112] rounded-2xl p-4 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm text-black dark:text-white">Current Session</p>
                    <span className="bg-black/5 dark:bg-white/10 text-black dark:text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Mac OS • Chrome Browser</p>
                </div>
              </div>

              <div className="bg-[#f5f5f7] dark:bg-[#111112] rounded-2xl p-4 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-black dark:text-white mb-1">Previous Login</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Windows 11 • Edge Browser</p>
                  <p className="text-[10px] text-gray-400">Yesterday at 14:23</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
