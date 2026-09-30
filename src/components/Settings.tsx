import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Moon, Bell, Globe, Trash2, Info, Check, Activity } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { deleteUser } from '../lib/firebase';
import { doc, deleteDoc } from '../lib/firebase';
import { isHapticsEnabled, setHapticsEnabled as saveHapticsStatus } from '../lib/haptics';
import { useNotification } from './NotificationProvider';

interface SettingsProps {
  onBack: () => void;
  key?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'es', name: 'Español' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'vi', name: 'Tiếng Việt' }
];

export default function Settings({ onBack }: SettingsProps) {
  const { showNotification } = useNotification();
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(isHapticsEnabled);
  const [showLangModal, setShowLangModal] = useState(false);
  const [currentLang, setCurrentLang] = useState('English');

  const toggleHaptics = () => {
    const newValue = !haptics;
    setHaptics(newValue);
    saveHapticsStatus(newValue);
    if (newValue && 'vibrate' in navigator) navigator.vibrate(20);
  };

  useEffect(() => {
    const saved = localStorage.getItem('preferred_language');
    if (saved) {
      try {
        const { code, name } = JSON.parse(saved);
        setCurrentLang(name);
        
        // If it's English, clear the cookie just in case
        if (code === 'en') {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }

        const interval = setInterval(() => {
            const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
            if (select) {
                if (select.value !== code) {
                    select.value = code;
                    select.dispatchEvent(new Event('change'));
                }
                clearInterval(interval);
            }
        }, 500);

        setTimeout(() => clearInterval(interval), 5000);
      } catch (e) {
          // ignore parsing error
      }
    } else {
        // Force English if no preference is saved to prevent browser-level guess
        setCurrentLang('English');
        const checkCookie = document.cookie.split('; ').find(row => row.startsWith('googtrans='));
        if (checkCookie) {
          const parts = checkCookie.split('=')[1].split('/');
          if (parts.length >= 3) {
            const code = parts[2];
            const lang = LANGUAGES.find(l => l.code === code);
            if (lang) {
                setCurrentLang(lang.name);
            }
          }
        }
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const changeLanguage = (code: string, name: string) => {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    let fallbackNeeded = true;
    if (select) {
        select.value = code;
        select.dispatchEvent(new Event('change'));
        fallbackNeeded = false;
    }

    if (code === 'en') {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      if (fallbackNeeded) document.cookie = "googtrans=/en/en; path=/";
    } else {
      document.cookie = `googtrans=/en/${code}; path=/`;
      document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname}`;
    }
    
    localStorage.setItem('preferred_language', JSON.stringify({ code, name }));
    setCurrentLang(name);
    setShowLangModal(false);
    
    if (fallbackNeeded) {
        window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    showNotification("Are you sure you want to delete your account? This action cannot be undone.", {
      title: 'DELETE ACCOUNT',
      type: 'error',
      onConfirm: async () => {
        try {
          if (auth.currentUser) {
             await deleteDoc(doc(db, 'users', auth.currentUser.uid));
             await deleteUser(auth.currentUser);
          }
        } catch (error) {
          console.error(error);
          showNotification("Failed to delete account. Please re-authenticate and try again.", { type: 'error', title: 'ACTION FAILED' });
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-[#F8F9FD] dark:bg-[#0B0C10] z-50 overflow-y-auto scroll-container"
    >
      <div className="safe-top flex items-center p-4 bg-white dark:bg-[#15171B] border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-10 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-4 notranslate" translate="no">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1C1E24] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase italic ml-4">Settings</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-[#1C1E24] rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 divide-y divide-slate-50 dark:divide-slate-800/50 text-slate-800 dark:text-slate-200">
            {/* Dark Mode */}
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-[#252830] rounded-xl"><Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                    <span className="font-bold">Dark Mode</span>
                </div>
                <button
                  onClick={toggleDarkMode}
                  style={{ backgroundColor: isDarkMode ? '#4A69BD' : '#CBD5E1' }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex ${
                    isDarkMode ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
            </div>

            {/* Notifications */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 cursor-pointer active:bg-slate-50 dark:active:bg-[#252830] transition-colors" onClick={() => setNotifications(!notifications)}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-[#252830] rounded-xl"><Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                    <span className="font-bold">Enable Notifications</span>
                </div>
                <button
                  style={{ backgroundColor: notifications ? '#4A69BD' : '#CBD5E1' }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${
                    notifications ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
            </div>

            {/* Haptics */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 cursor-pointer active:bg-slate-50 dark:active:bg-[#252830] transition-colors" onClick={toggleHaptics}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-[#252830] rounded-xl"><Activity className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                    <span className="font-bold">Haptic Feedback</span>
                </div>
                <button
                  style={{ backgroundColor: haptics ? '#4A69BD' : '#CBD5E1' }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${
                    haptics ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
            </div>

            {/* Language */}
            <div onClick={() => setShowLangModal(true)} className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-[#252830] transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-[#252830] rounded-xl"><Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                    <span className="font-bold">Language</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-bold text-sm tracking-tight">{currentLang}</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
            </div>
            
            {/* Version */}
            <div className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-[#252830] transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-[#252830] rounded-xl"><Info className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                    <span className="font-bold">About Zalando Pro Data Driven Platform</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-bold text-sm">Version 1.0.0</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-3xl p-5 border border-rose-100 dark:border-rose-500/20">
             <div onClick={handleDeleteAccount} className="flex items-center gap-3 text-rose-600 dark:text-rose-400 cursor-pointer">
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                <div>
                   <span className="font-black block text-sm">Delete Account</span>
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">This action cannot be undone</span>
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showLangModal && (
          <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-[#15171B] w-full max-w-sm rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="safe-top p-6 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-white dark:bg-[#1C1E24] z-10 sticky top-0">
                <div>
                    <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase italic tracking-tight">Select Language</h3>
                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">Global Support</p>
                </div>
                <button onClick={() => setShowLangModal(false)} className="w-10 h-10 bg-slate-100 dark:bg-[#252830] rounded-full flex items-center justify-center text-slate-500">
                    <ArrowLeft className="w-5 h-5 -rotate-45" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2 [&::-webkit-scrollbar]:hidden">
                {LANGUAGES.map((lang) => (
                  <div
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code, lang.name)}
                    className="flex items-center justify-between p-4 rounded-2xl active:bg-slate-50 dark:active:bg-[#1C1E24] cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all font-bold text-slate-700 dark:text-slate-300"
                  >
                    <span>{lang.name}</span>
                    {currentLang === lang.name && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary" />
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
