import { motion } from 'motion/react';
import { ChevronLeft, Zap, ShieldCheck, Gem, TrendingUp, Users, Building2, ExternalLink } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
  key?: string;
}

export default function About({ onBack }: AboutProps) {
  const features = [
    {
      icon: Zap,
      title: 'Rapid Task Processing',
      desc: 'Our core engine settles orders in milliseconds, returning capital + commission instantly upon completion.',
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Grade Security',
      desc: 'Every extraction operation relies on blockchain traceability and immutable ledgers. Your assets are 100% safeguarded.',
    },
    {
      icon: Gem,
      title: 'Premium Tier Yields',
      desc: 'Direct brand partnerships eliminate middlemen, passing maximum retail margins up to 12.5% back to the user community.',
    },
  ];

  const ecosystem = [
    { step: '1', title: 'Agents', desc: 'Execute tasks', icon: Users },
    { step: '2', title: 'Smart Algorithm', desc: 'Automated matching', icon: Zap },
    { step: '3', title: '100% Payouts', desc: 'Real-time settlements', icon: TrendingUp },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 z-50 bg-white dark:bg-black pb-24 font-sans overflow-y-auto"
    >
      {/* Header */}
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="sticky top-0 z-50 bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/10 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between transition-all"
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">About</span>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-8 pt-6">

        {/* Hero */}
        <div className="pl-2">
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight leading-tight">
            The Zalando Pro <br /> Advantage.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Our unique data-driven algorithm synergizes lifestyle brands with high-yield investor networks to produce unmatched returns on daily tasks.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-5 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">Secure</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">SSL-256</p>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-5 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">100%</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Payouts</p>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-5 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">Fast</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Instant</p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-4 pl-2 tracking-tight">Why we are better.</h2>
          <div className="flex flex-col gap-4">
            {features.map((feat, idx) => {
              const isDark = idx === 1;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-[2rem] p-6 flex items-start gap-4 ${isDark ? 'bg-black dark:bg-[#111112]' : 'bg-[#f5f5f7] dark:bg-[#1d1d1f]'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/5 dark:bg-white/10'}`}>
                    <feat.icon className={`w-5 h-5 ${isDark ? 'text-white' : 'text-black dark:text-white'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-black dark:text-white'}`}>
                      {feat.title}
                    </h3>
                    <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Ecosystem Flow */}
        <div className="bg-black dark:bg-[#111112] rounded-[2rem] p-6">
          <h2 className="text-2xl font-bold tracking-tight mb-6 text-white">Ecosystem Flow.</h2>
          <div className="flex flex-col gap-5">
            {ecosystem.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                </div>
                <span className="text-xs font-bold text-gray-500">Step {item.step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-6 text-center">
          <h3 className="text-xl font-bold text-black dark:text-white tracking-tight mb-2">
            Join the Elite.
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Zalando Pro — Redefining Digital Earnings.
          </p>
        </div>

      </div>
    </motion.div>
  );
}
