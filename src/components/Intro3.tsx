import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shirt, ShoppingBag, TrendingUp, ArrowRight, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';
import Logo from './Logo';

interface Intro3Props {
  onStart: () => void;
  key?: string;
}

export default function Intro3({ onStart }: Intro3Props) {
  const [activeStep, setActiveStep] = useState(0);

  const STEPS = [
    {
      id: 1,
      stepNum: '01',
      title: 'Bulk Fashion Sourcing',
      subtitle: 'Wholesale Procurement',
      description: 'Your capital is deployed by Zalando Pro to procure high-demand European clothing & luxury fashion bulk inventory.',
      icon: <Shirt className="w-5 h-5 text-[#0071e3] dark:text-[#2997ff]" />,
      badge: 'Inventory Procurement',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      stepNum: '02',
      title: 'Global E-Commerce Resale',
      subtitle: 'Automated Sales Distribution',
      description: 'Items are automatically resold across global online retail channels at high profit margins with zero hassle.',
      icon: <ShoppingBag className="w-5 h-5 text-[#af52de] dark:text-[#bf5af2]" />,
      badge: 'Automated Resell',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      stepNum: '03',
      title: 'Daily Profit Payouts',
      subtitle: 'Guaranteed Task Rewards',
      description: 'Resale profit margins are shared with you daily. Complete task orders to receive instant commission credits.',
      icon: <TrendingUp className="w-5 h-5 text-[#30d158]" />,
      badge: 'Daily Earnings',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col items-center p-5 sm:p-6 overflow-y-auto scroll-container transition-colors duration-500 z-10 font-sans"
    >
      {/* Apple Subtle Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 pointer-events-none overflow-hidden opacity-60 dark:opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0071e3]/15 via-purple-500/5 to-transparent blur-3xl" />
      </div>

      {/* Header Bar */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4 relative z-10 pt-1">
        <Logo className="w-16 h-16" variant="blue" />
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl rounded-full border border-[#d2d2d7]/50 dark:border-[#38383a]/60 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#30d158]" />
          <span className="text-[10px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight uppercase">
            Verified Model
          </span>
        </div>
      </div>

      {/* Hero Title Section */}
      <div className="w-full max-w-sm text-center mb-5 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0071e3]/10 dark:bg-[#2997ff]/15 rounded-full text-[#0071e3] dark:text-[#2997ff] text-[10px] font-semibold tracking-wide uppercase mb-2.5 backdrop-blur-md">
          <img src="/logo.png" className="w-3.5 h-3.5 object-contain" alt="Zalando Logo" /> How Zalando Pro Works
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight leading-none">
          How You Earn Daily
        </h1>
        <p className="text-xs font-normal text-[#86868b] dark:text-[#86868b] mt-2 leading-relaxed px-2">
          Your investment fuels global apparel resale for guaranteed returns
        </p>
      </div>

      {/* Apple Pro Showcase Feature Card */}
      <div className="w-full max-w-sm relative z-10 mb-5">
        <div className="relative aspect-[16/10] w-full rounded-[26px] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_50px_rgba(0,0,0,0.6)] border border-[#d2d2d7]/40 dark:border-[#38383a]/80 bg-[#000000]">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeStep}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              src={STEPS[activeStep].image}
              alt={STEPS[activeStep].title}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Apple Gradient Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/90 via-[#000000]/30 to-transparent flex flex-col justify-between p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <span className="px-3 py-1 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-white/20 dark:bg-black/40 backdrop-blur-xl text-white border border-white/20 shadow-sm">
                {STEPS[activeStep].badge}
              </span>
              <span className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xl text-white font-mono font-bold text-xs flex items-center justify-center border border-white/30">
                {STEPS[activeStep].stepNum}
              </span>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug drop-shadow-sm">
                {STEPS[activeStep].title}
              </h3>
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
                {STEPS[activeStep].subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Apple-style Interactive List Cards */}
      <div className="w-full max-w-sm space-y-2.5 relative z-10 mb-6">
        {STEPS.map((step, idx) => {
          const isSelected = activeStep === idx;
          return (
            <motion.div
              key={step.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-[20px] transition-all duration-300 cursor-pointer border ${
                isSelected
                  ? 'bg-white dark:bg-[#1c1c1e] border-[#0071e3] dark:border-[#2997ff] shadow-[0_8px_25px_rgba(0,113,227,0.15)] dark:shadow-[0_10px_30px_rgba(41,151,255,0.15)] ring-1 ring-[#0071e3] dark:ring-[#2997ff]'
                  : 'bg-white/70 dark:bg-[#1c1c1e]/60 backdrop-blur-xl border-[#d2d2d7]/50 dark:border-[#38383a]/60 hover:bg-white dark:hover:bg-[#1c1c1e]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isSelected 
                    ? 'bg-[#0071e3]/10 dark:bg-[#2997ff]/20' 
                    : 'bg-[#f5f5f7] dark:bg-[#2c2c2e]'
                }`}>
                  {step.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight truncate flex items-center gap-1.5">
                      {step.title}
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#2997ff] shrink-0" />}
                    </h4>
                    <span className="text-[10px] font-mono font-medium text-[#86868b]">
                      0{step.id}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#86868b] dark:text-[#86868b] font-normal leading-relaxed line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Action */}
      <div className="w-full max-w-sm relative z-10 mt-auto pb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          style={{ backgroundColor: '#4A69BD', color: '#FFFFFF' }}
          className="w-full py-4 px-8 rounded-[18px] text-lg font-black uppercase tracking-widest shadow-lg shadow-[#4A69BD]/30 transition-all duration-300 flex items-center justify-center gap-3"
        >
          Let's Start
          <ArrowRight className="w-5 h-5" />
        </motion.button>
        
        {/* Apple Segmented Pagination Dots */}
        <div className="mt-4 flex justify-center items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeStep === i ? 'w-6 bg-[#0071e3] dark:bg-[#2997ff]' : 'w-1.5 bg-[#d2d2d7] dark:bg-[#38383a]'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}


