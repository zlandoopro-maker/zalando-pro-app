import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English (Default)', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
    setIsOpen(false);
  };

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#1C1E24] hover:bg-slate-100 dark:hover:bg-[#252830] border-2 border-slate-200 dark:border-slate-800/50 rounded-2xl shadow-sm transition-all active:scale-95"
      >
        <Globe className="w-5 h-5 text-primary dark:text-[#A1E3E8]" />
        <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{currentLanguage.code}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex min-h-full items-center justify-center p-6 py-12">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#1C1E24] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black italic text-slate-800 dark:text-white uppercase tracking-tighter">
                    Select Language
                  </h3>
                  <div className="h-1 w-12 bg-primary/20 rounded-full mx-auto mt-2"></div>
                </div>

                {/* Language Options */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {LANGUAGES.map((lang) => {
                    const isSelected = i18n.language === lang.code || i18n.language?.startsWith(lang.code + '-');
                    return (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all active:scale-95 ${
                          isSelected
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/5'
                            : 'border-transparent bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-black/40'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <span className="text-4xl filter drop-shadow-sm">{lang.flag}</span>
                          <div className="text-left">
                            <p className={`font-black text-base ${isSelected ? 'text-primary dark:text-[#A1E3E8]' : 'text-slate-800 dark:text-white'}`}>
                              {lang.nativeName}
                            </p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                              {lang.name}
                            </p>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isSelected ? 'bg-primary border-primary' : 'bg-transparent border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-5 h-5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Cancel */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-5 mt-8 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-sm active:scale-95 transition-all shadow-inner"
                >
                  Close Selection
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
