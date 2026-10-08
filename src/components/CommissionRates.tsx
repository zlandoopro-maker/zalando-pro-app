import { motion } from 'motion/react';
import { ChevronLeft, Calculator, Activity, ArrowRight, Wallet, Percent, Calendar } from 'lucide-react';
import { TIERS } from '../lib/tiers';

interface CommissionRatesProps {
  onBack: () => void;
  key?: string;
}

export default function CommissionRates({ onBack }: CommissionRatesProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-white dark:bg-black pb-24 font-sans overflow-y-auto"
    >
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="safe-top sticky top-0 z-50 bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center justify-between transition-all"
      >
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">Commission Rates</span>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-8 pt-6">
        
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pl-2"
        >
          <p className="text-sm font-semibold text-[#bf5af2] mb-2 tracking-wide">COMMISSION RATES</p>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
            Maximize <br /> your earnings.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Upgrade your plan to unlock higher commission rates, more daily orders, and bigger rewards.
          </p>
        </motion.div>

        {/* Formula */}
        <motion.div 
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.6 }}
           className="flex flex-col gap-4"
        >
          <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-[2rem] p-6 flex flex-col relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-[#0a84ff]/10 flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-[#0a84ff]" />
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white tracking-tight mb-1">Daily Wages</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-6">Approx Price × Clicks × Rate %</p>
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <code className="text-xs font-mono font-bold text-gray-900 dark:text-gray-200">Ex: $40 × 30 × 0.3%</code>
              <div className="flex items-center gap-2 text-[#0a84ff] font-bold">
                 <ArrowRight className="w-4 h-4"/> 
                 <span>$3.60/day</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] rounded-[2rem] p-6 flex flex-col text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#30d158]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-[#30d158]/15 flex items-center justify-center mb-4 relative z-10">
              <Activity className="w-6 h-6 text-[#30d158]" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-1 relative z-10">90-Days Total</h3>
            <p className="text-xs text-gray-400 font-medium mb-6 relative z-10">Daily Wages × 90 Days</p>
            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
              <code className="text-xs font-mono font-bold text-white/80">Ex: $3.60 × 90</code>
               <div className="flex items-center gap-2 text-[#30d158] font-bold">
                 <ArrowRight className="w-4 h-4"/> 
                 <span>$324 Total</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Individual Tiers Grid */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-black dark:text-white mb-4 pl-2 tracking-tight">Tier Breakdown.</h2>
          <div className="flex flex-col gap-4">
            {TIERS.map((tier, idx) => {
              const ninetyDaysVal = (tier.reward * 90).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              
              // Apply dynamic styling based on tier
              let accentColor = '#8e8e93'; // Gray default
              let bgClass = 'bg-[#f5f5f7] dark:bg-[#1c1c1e]';
              let textDark = false;

              if (idx === 1) { accentColor = '#0a84ff'; bgClass = 'bg-gradient-to-br from-[#0a84ff]/5 to-[#0a84ff]/10 dark:from-[#0a84ff]/10 dark:to-[#0a84ff]/20 border border-[#0a84ff]/20'; } // V1
              else if (idx === 2) { accentColor = '#30d158'; bgClass = 'bg-gradient-to-br from-[#30d158]/5 to-[#30d158]/10 dark:from-[#30d158]/10 dark:to-[#30d158]/20 border border-[#30d158]/20'; } // V2
              else if (idx === 3) { accentColor = '#ff9f0a'; bgClass = 'bg-gradient-to-br from-[#ff9f0a]/5 to-[#ff9f0a]/10 dark:from-[#ff9f0a]/10 dark:to-[#ff9f0a]/20 border border-[#ff9f0a]/20'; } // V3
              else if (idx === 4) { accentColor = '#ff375f'; bgClass = 'bg-gradient-to-br from-[#ff375f]/5 to-[#ff375f]/10 dark:from-[#ff375f]/10 dark:to-[#ff375f]/20 border border-[#ff375f]/20'; } // V4
              else if (idx === 5) { accentColor = '#bf5af2'; bgClass = 'bg-gradient-to-br from-[#bf5af2]/5 to-[#bf5af2]/10 dark:from-[#bf5af2]/10 dark:to-[#bf5af2]/20 border border-[#bf5af2]/20'; } // V5
              
              // Make Trainee standard dark in dark mode
              if (idx === 0) {
                 bgClass = 'bg-[#f5f5f7] dark:bg-[#1c1c1e]';
              }

              return (
                <motion.div 
                  key={tier.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                  className={`relative rounded-[2rem] p-6 flex flex-col ${bgClass}`}
                >
                  <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-xs font-bold uppercase tracking-wider`} style={{ color: accentColor }}>
                        {tier.name}
                      </p>
                      {idx > 0 && (
                        <div className="px-2 py-1 rounded-full text-[9px] font-bold uppercase" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                           Recommended
                        </div>
                      )}
                    </div>
                    
                    <h3 className={`text-4xl font-bold tracking-tight mb-6 text-black dark:text-white flex items-baseline gap-1`}>
                      ${tier.price} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">price</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800/50">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                           <Percent className="w-4 h-4"/>
                           <span className="text-xs font-medium">Rate</span>
                        </div>
                        <span className={`text-sm font-bold text-black dark:text-white`}>{tier.commissionRate}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800/50">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                           <Activity className="w-4 h-4"/>
                           <span className="text-xs font-medium">Clicks</span>
                        </div>
                        <span className={`text-sm font-bold text-black dark:text-white`}>{tier.dailyTasks}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800/50">
                         <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                           <Wallet className="w-4 h-4"/>
                           <span className="text-xs font-medium">Daily</span>
                        </div>
                        <span className={`text-sm font-bold text-black dark:text-white`}>${tier.reward.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-1">
                         <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                           <Calendar className="w-4 h-4"/>
                           <span className="text-xs font-medium">90 Days</span>
                        </div>
                        <span className={`text-base font-bold`} style={{ color: accentColor }}>${ninetyDaysVal}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
