import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ArrowLeft } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English (Default)', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
];

interface LanguagePageProps {
  onBack: () => void;
}

export default function LanguagePage({ onBack }: LanguagePageProps) {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
    onBack();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-[100dvh] bg-slate-50 dark:bg-[#0B0C10] flex flex-col overflow-y-auto scroll-container"
    >
      {/* Header */}
      <div className="bg-white dark:bg-[#15171B] p-6 pt-[max(2.5rem,env(safe-area-inset-top,0px))] flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h2 className="text-xl font-black italic text-slate-800 dark:text-white uppercase tracking-tighter">
            Select Language
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Personalize your experience
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-3xl border border-primary/10 mb-6 flex items-center gap-5">
           <div className="w-16 h-16 bg-white dark:bg-[#1C1E24] rounded-2xl flex items-center justify-center shadow-lg">
              <Globe className="w-8 h-8 text-primary" />
           </div>
           <div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg">System Language</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred communication language.</p>
           </div>
        </div>

        <div className="space-y-3 pb-10">
          {LANGUAGES.map((lang) => {
            const isSelected = i18n.language === lang.code || i18n.language?.startsWith(lang.code + '-');
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-primary bg-white dark:bg-[#1C1E24] shadow-xl shadow-primary/10'
                    : 'border-transparent bg-white dark:bg-[#15171B] hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-5">
                  <span className="text-4xl filter drop-shadow-sm">{lang.flag}</span>
                  <div className="text-left">
                    <p className={`font-black text-base ${isSelected ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>
                      {lang.nativeName}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {lang.name}
                    </p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  isSelected ? 'bg-primary border-primary' : 'bg-transparent border-slate-200 dark:border-slate-700'
                }`}>
                  {isSelected && <Check className="w-5 h-5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
