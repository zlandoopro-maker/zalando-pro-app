import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet2, ArrowDownCircle, Share2, ShieldCheck, ChevronRight, Zap, ShoppingBag, ChevronDown, Headset, ArrowRight } from 'lucide-react';
import { Screen } from '../types';
import { vibrateLight } from '../lib/haptics';

interface AppTutorialProps {
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
  key?: string;
}

export default function AppTutorial({ onBack, onNavigate }: AppTutorialProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    vibrateLight();
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const sections = [
    {
      subtitle: 'DEPOSIT (TRC-20)',
      title: 'Quick, secure deposits.',
      desc: 'Recharge your account balance via USDT-TRC20 or Binance Pay in 5–30 minutes.',
      icon: <Wallet2 className="w-7 h-7" />,
      bg: 'bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]',
      iconBg: 'bg-[#0a84ff]/15',
      iconColor: 'text-[#0a84ff]',
      textLight: true,
      accentColor: '#0a84ff',
      actionText: 'Go to Deposit',
      actionScreen: 'deposit' as Screen,
      steps: [
        '1. Go to Account → Deposit and choose USDT (TRC-20) or Binance Pay.',
        '2. Copy your unique wallet address or scan the QR code.',
        '3. Send exact USDT from your crypto wallet (Binance, Trust Wallet, OKX).',
        '4. Paste your transaction Hash (TXID / Order ID) and tap Submit Deposit.',
        '5. Admin verifies your deposit and credits your balance within 5–30 minutes.'
      ],
      tip: 'Paste your TXID in 24/7 Support Chat anytime for instant verification status tracking!'
    },
    {
      subtitle: 'POSITION TIERS',
      title: 'Choose your growth tier.',
      desc: 'Unlock higher daily merchandise extraction limits and premium profit multipliers.',
      icon: <Zap className="w-7 h-7" />,
      bg: 'bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] dark:from-[#1c1c1e] dark:to-[#2c2c2e]',
      iconBg: 'bg-[#f59e0b]/15',
      iconColor: 'text-[#f59e0b]',
      textLight: false,
      accentColor: '#f59e0b',
      actionText: 'View Position Tiers',
      actionScreen: 'home' as Screen,
      steps: [
        '1. Check available Position Tiers on the Home screen (Trainee, General, Senior Manager).',
        '2. Hold & Press any tier card to preview the 3D earnings and profit breakdown model.',
        '3. Ensure your wallet balance meets the minimum tier requirement ($50 for Trainee).',
        '4. Tap "Activate Plan" to subscribe and begin receiving daily tasks immediately.'
      ],
      tip: 'Higher tiers grant higher daily task limits and bigger daily reward payouts!'
    },
    {
      subtitle: 'DAILY EXTRACTIONS',
      title: 'Daily tasks. Instant profits.',
      desc: 'Extract top European fashion inventory and collect guaranteed real-time commissions.',
      icon: <ShoppingBag className="w-7 h-7" />,
      bg: 'bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]',
      iconBg: 'bg-[#30d158]/15',
      iconColor: 'text-[#30d158]',
      textLight: true,
      accentColor: '#30d158',
      actionText: 'Start Daily Tasks',
      actionScreen: 'tasks' as Screen,
      steps: [
        '1. Tap the central "Task" button in the bottom navigation bar.',
        '2. Tap "Start Extraction" to match trending wholesale fashion merchandise.',
        '3. Submit each extraction to receive instant profit credits in your balance.',
        '4. Complete all daily tasks assigned to your plan tier (e.g., 30 tasks/day).'
      ],
      tip: 'Tasks reset daily at midnight IST. You must complete tasks for 3 consecutive days to unlock withdrawal eligibility.'
    },
    {
      subtitle: 'WITHDRAW EARNINGS',
      title: 'Your money. Whenever.',
      desc: 'Withdraw daily task profits and principal balance directly to your crypto wallet.',
      icon: <ArrowDownCircle className="w-7 h-7" />,
      bg: 'bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] dark:from-[#1c1c1e] dark:to-[#2c2c2e]',
      iconBg: 'bg-[#bf5af2]/15',
      iconColor: 'text-[#bf5af2]',
      textLight: false,
      accentColor: '#bf5af2',
      actionText: 'Go to Withdrawal',
      actionScreen: 'withdrawal' as Screen,
      steps: [
        '1. Go to Account → Withdrawal and enter your cashout amount (Minimum $10).',
        '2. Enter your USDT TRC-20 receiving wallet address.',
        '3. Confirm withdrawal request — processed within 24–48 working hours.',
        '4. Track pending cashout status anytime by pasting your TXID into Support Chat.'
      ],
      tip: 'Withdrawals are processed Monday to Friday, 10:00 AM – 10:00 PM IST.'
    },
    {
      subtitle: 'REFERRAL REWARDS',
      title: 'Share the wealth.',
      desc: 'Build your team and earn automated passive daily commissions up to 3 levels deep.',
      icon: <Share2 className="w-7 h-7" />,
      bg: 'bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]',
      iconBg: 'bg-[#ff375f]/15',
      iconColor: 'text-[#ff375f]',
      textLight: true,
      accentColor: '#ff375f',
      actionText: 'Team Mechanism',
      actionScreen: 'team-mechanism' as Screen,
      steps: [
        '1. Go to Home → Team Mechanism and copy your unique Referral Link or Code.',
        '2. Level 1 (Direct Team): Earn 5% of their daily task commissions.',
        '3. Level 2 (Secondary Team): Earn 3% of their daily task commissions.',
        '4. Level 3 (Tertiary Team): Earn 1% of their daily task commissions.'
      ],
      tip: 'Referral earnings are credited automatically every single day as your team completes tasks!'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-white dark:bg-black pb-28 font-sans"
    >
      {/* Apple Frosted Sticky Navbar */}
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="safe-top sticky top-0 z-50 bg-white/70 dark:bg-black/70 border-b border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center justify-between transition-all"
      >
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white dark:bg-[#1c1c1e] p-0.5 border border-[#ff6b00]/30 flex items-center justify-center">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">App Tutorial</span>
        </div>
        <button
          onClick={() => { vibrateLight(); onNavigate('help-chat'); }}
          className="w-10 h-10 rounded-full bg-[#0a84ff]/10 dark:bg-[#0a84ff]/20 text-[#0a84ff] flex items-center justify-center active:scale-90 transition-transform"
        >
          <Headset className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 space-y-6 pt-6 max-w-xl mx-auto">
        {/* Apple Style Intro Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 pl-2"
        >
          <p className="text-sm font-semibold text-[#0a84ff] mb-2 tracking-wide uppercase">HOW IT WORKS</p>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
            Get to know <br /> Zalando Pro.
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Tap any card to view detailed step-by-step instructions.
          </p>
        </motion.div>

        {/* Apple Card Grid */}
        <div className="flex flex-col gap-5">
          {sections.map((section, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                onClick={() => toggleExpand(idx)}
                className={`relative rounded-[2.2rem] p-6 flex flex-col group overflow-hidden cursor-pointer transition-all ${section.bg}`}
              >
                {/* Subtle Ambient Glow Circle */}
                <div 
                  className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-25 pointer-events-none"
                  style={{ backgroundColor: section.accentColor }}
                />

                <div className="relative z-10 h-full flex flex-col">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${section.iconBg} flex items-center justify-center`}>
                      <div className={section.iconColor}>
                        {section.icon}
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${section.textLight ? 'bg-white/10 text-white' : 'bg-black/5 dark:bg-white/10 text-black dark:text-white'}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${section.textLight ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {section.subtitle}
                  </p>

                  <h3 className={`text-2xl font-bold leading-tight tracking-tight mb-2 ${section.textLight ? 'text-white' : 'text-black dark:text-white'}`}>
                    {section.title}
                  </h3>

                  <p className={`text-sm font-medium leading-relaxed ${section.textLight ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {section.desc}
                  </p>

                  {/* Expandable Step-by-Step Breakdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="mt-4 pt-4 border-t border-white/10 dark:border-white/10 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className={`text-xs font-bold uppercase tracking-wider ${section.textLight ? 'text-[#0a84ff]' : 'text-[#0a84ff]'}`}>
                          Step-by-Step Instructions:
                        </p>

                        <div className="space-y-2">
                          {section.steps.map((stepText, sIdx) => (
                            <div 
                              key={sIdx} 
                              className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${
                                section.textLight 
                                  ? 'bg-white/5 text-gray-200 border border-white/10' 
                                  : 'bg-black/5 dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/10'
                              }`}
                            >
                              {stepText}
                            </div>
                          ))}
                        </div>

                        {section.tip && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium flex items-start gap-2 mt-2">
                            <img src="/logo.png" className="w-4 h-4 object-contain shrink-0 mt-0.5" alt="Logo" />
                            <div>
                              <strong className="font-bold">Pro Tip: </strong>{section.tip}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => { vibrateLight(); onNavigate(section.actionScreen); }}
                            className="px-4 py-2 bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white rounded-full text-xs font-bold tracking-tight shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                          >
                            <span>{section.actionText}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}

          {/* Security Card — Full Width Apple Emphasis */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative rounded-[2.2rem] p-8 flex flex-col items-center text-center bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] dark:from-[#1c1c1e] dark:to-[#2c2c2e] overflow-hidden"
          >
            {/* Subtle animated ring */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-40 h-40 rounded-full border-2 border-[#30d158] pointer-events-none"
            />
            <div className="w-14 h-14 rounded-2xl bg-[#30d158]/15 flex items-center justify-center mb-4 relative z-10">
              <ShieldCheck className="w-7 h-7 text-[#30d158]" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-2 relative z-10">
              Privacy and Security. <br />Built in.
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xs relative z-10 leading-relaxed">
              Never share your password or private keys. We protect your data so you can focus on growing your business.
            </p>

            <button
              onClick={() => { vibrateLight(); onNavigate('help-chat'); }}
              className="mt-5 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold tracking-tight shadow-md flex items-center gap-2 active:scale-95 transition-all relative z-10"
            >
              <Headset className="w-4 h-4" />
              <span>Contact Support Chat</span>
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
