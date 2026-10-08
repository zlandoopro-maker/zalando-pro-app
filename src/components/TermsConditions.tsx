import { motion } from 'motion/react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export default function TermsConditions({ onBack }: { onBack: () => void; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="min-h-[100dvh] bg-[#F5F3FF] dark:bg-[#0B0C10] flex flex-col font-sans"
    >
      <div className="bg-white dark:bg-[#1C1E24] shadow-sm sticky top-0 z-10 p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white absolute left-1/2 -translate-x-1/2">
          Terms & Conditions
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto pb-12">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-black italic text-slate-800 dark:text-white text-center">
            User Agreement
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white dark:bg-[#1C1E24] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 space-y-4">
          <p>
            [Please insert your legally reviewed Terms and Conditions here. A lawyer should draft documents concerning user financial liabilities, risk disclaimers, and commission structures.]
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <h3 className="text-base font-bold text-slate-800 dark:text-white pt-2">1. Use of Service</h3>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <h3 className="text-base font-bold text-slate-800 dark:text-white pt-2">2. Liability</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
          </p>
        </div>
      </div>
    </motion.div>
  );
}
