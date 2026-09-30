import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ShieldCheck, Lock, FileCheck, Cpu, Building2, ExternalLink, Globe, TrendingUp } from 'lucide-react';
import { Screen } from '../types';

interface AppIntroductionProps {
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
  key?: string;
}

const PARTNER_BRANDS = [
  { name: 'Zalando SE', desc: 'Global E-Commerce', flag: '🇩🇪' },
  { name: 'Tommy Hilfiger', desc: 'Liquidation Partner', flag: '🇺🇸' },
  { name: 'Nike Fashion', desc: 'Inventory Provider', flag: '🇺🇸' },
  { name: 'Hugo Boss AG', desc: 'Apparel Syndicate', flag: '🇩🇪' },
];

const COMPLIANCE = [
  { title: 'EU ISO 27001', desc: 'Security Management', icon: ShieldCheck, color: '#30d158' },
  { title: 'SSL 256-Bit', desc: 'Bank-Grade Protocol', icon: Lock, color: '#0a84ff' },
  { title: 'AML & KYC', desc: 'Anti-Money Laundering', icon: FileCheck, color: '#ff9f0a' },
  { title: 'Smart Contract', desc: 'Escrow Settlement', icon: Cpu, color: '#bf5af2' }
];

export default function AppIntroduction({ onBack, onNavigate }: AppIntroductionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white bg-black/5 dark:bg-white/10 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-bold text-black/90 dark:text-white/90 tracking-tight">App Introduction</span>
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
          <p className="text-sm font-semibold text-[#0a84ff] mb-2 tracking-wide">ABOUT THE PLATFORM</p>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
            Institutional <br /> E-Commerce.
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            Zalando Pro connects global brand liquidations with retail users. Participate in high-velocity product extractions.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="col-span-2 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] rounded-[2rem] p-6 flex flex-col items-center text-center relative overflow-hidden">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-48 h-48 rounded-full bg-[#0a84ff] pointer-events-none"
            />
            <h3 className="text-4xl font-bold text-white tracking-tight mb-1 relative z-10">$2.4B+</h3>
            <p className="text-xs text-gray-400 font-medium relative z-10">Quarterly Turnover</p>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-[2rem] p-5 flex flex-col items-center text-center">
            <motion.h3 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="text-3xl font-bold text-black dark:text-white tracking-tight mb-1"
            >
              100%
            </motion.h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Escrow</p>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-[2rem] p-5 flex flex-col items-center text-center">
            <motion.h3 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className="text-3xl font-bold text-black dark:text-white tracking-tight mb-1"
            >
              450K+
            </motion.h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Merchants</p>
          </div>
        </motion.div>

        {/* How it works — Dark themed */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] rounded-[2rem] p-6 text-white relative overflow-hidden"
        >
          {/* Subtle glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#0a84ff]/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl font-bold tracking-tight mb-2 relative z-10">How value is generated.</h2>
          <p className="text-xs text-gray-400 font-medium mb-6 relative z-10">Three-step profit engine</p>
          
          <div className="flex flex-col gap-0 relative z-10">
            {[
              { num: '1', title: 'Inventory Acquisition', desc: 'Zalando Pro buys bulk fashion clearance at 60-80% discounts.', color: '#0a84ff' },
              { num: '2', title: 'Retail Reselling', desc: 'Merchandise is resold across global e-commerce platforms.', color: '#30d158' },
              { num: '3', title: 'Dividend Settlement', desc: 'Profit margins are shared with you as daily commissions.', color: '#ff9f0a' },
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + idx * 0.12, duration: 0.5 }}
                className="flex items-start gap-4 relative"
              >
                {/* Connector line */}
                {idx < 2 && (
                  <div className="absolute left-5 top-12 w-px h-10 bg-white/10" />
                )}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                  style={{ borderColor: `${step.color}40`, backgroundColor: `${step.color}15` }}
                >
                  <span className="text-sm font-bold" style={{ color: step.color }}>{step.num}</span>
                </div>
                <div className="flex-1 pb-8">
                  <h4 className="text-base font-bold mb-1">{step.title}</h4>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Compliance Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-black dark:text-white mb-4 pl-2 tracking-tight">Security & Compliance.</h2>
          <div className="grid grid-cols-2 gap-3">
            {COMPLIANCE.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.08, duration: 0.4 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-[1.5rem] p-5 flex flex-col"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h4 className="text-sm font-bold text-black dark:text-white mb-0.5">{item.title}</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-[2rem] p-6"
        >
          <h3 className="text-xl font-bold text-black dark:text-white tracking-tight mb-5">Brand Partners.</h3>
          <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-800">
            {PARTNER_BRANDS.map((partner, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <span className="text-xl">{partner.flag}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-black dark:text-white">{partner.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{partner.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
