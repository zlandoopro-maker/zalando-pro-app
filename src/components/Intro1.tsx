import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Logo from './Logo';

interface Intro1Props {
  onNext: () => void;
  key?: string | number;
}

export default function Intro1({ onNext }: Intro1Props) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 bg-intro flex flex-col items-center justify-between p-8 text-white text-center overflow-hidden z-10"
    >
      {/* Dynamic Animated Background Accents */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0.25, 0.45, 0.25], 
          scale: [1, 1.15, 1], 
          rotate: [0, 90, 180] 
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-15%] right-[-15%] w-[75%] h-[75%] bg-white/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0.15, 0.35, 0.15], 
          scale: [1, 1.2, 1], 
          rotate: [0, -90, -180] 
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 1 }}
        className="absolute bottom-[-15%] left-[-15%] w-[65%] h-[65%] bg-white/5 rounded-full blur-2xl pointer-events-none"
      />
      
      {/* Brand & Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm pt-4">
        {/* 1. App Logo with Spring Entrance & Continuous Float */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 120, 
            damping: 14, 
            delay: 0.15 
          }}
          className="relative mb-6 flex items-center justify-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.9 
            }}
          >
            <Logo className="w-56 h-56 drop-shadow-[0_15px_25px_rgba(0,0,0,0.3)]" variant="white" />
          </motion.div>
        </motion.div>

        {/* 2. ZALANDO PRO Header - Slides up from bottom */}
        <motion.h1 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.7, 
            delay: 0.35, 
            ease: [0.215, 0.61, 0.355, 1] 
          }}
          className="text-4xl font-extrabold uppercase italic tracking-tighter leading-none text-white drop-shadow-md mb-1"
        >
          Zalando Pro
        </motion.h1>

        {/* 3. Data Driven Platform Subtitle - Slides up from bottom */}
        <motion.h2 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.7, 
            delay: 0.55, 
            ease: [0.215, 0.61, 0.355, 1] 
          }}
          className="text-2xl font-bold tracking-tight text-white/95 mb-6 drop-shadow-sm"
        >
          Data Driven Platform
        </motion.h2>

        {/* 4. Description Text - Slides from Top to Down (up-to-down to exact place) */}
        <motion.p 
          initial={{ opacity: 0, y: -35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.7, 
            delay: 0.75, 
            ease: "easeOut" 
          }}
          className="text-sm font-medium text-white/80 max-w-xs mx-auto leading-relaxed text-center px-2"
        >
          Every drive data and sales data is a valuable asset to our partner retailers
        </motion.p>
      </div>

      {/* 5. Next Button Container - Slides up from bottom with spring pop */}
      <motion.div
        initial={{ opacity: 0, y: 70, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 140, 
          damping: 14, 
          delay: 0.95 
        }}
        className="my-8 flex flex-col items-center"
      >
        <motion.button
          animate={{ 
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 0 0 0px rgba(255,255,255,0.3)", 
              "0 0 0 20px rgba(255,255,255,0)", 
              "0 0 0 0px rgba(255,255,255,0)"
            ]
          }}
          transition={{ 
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ scale: 1.12, background: "rgba(255,255,255,0.25)" }}
          whileTap={{ scale: 0.92 }}
          onClick={onNext}
          aria-label="Next screen"
          style={{ backgroundColor: '#4A69BD', color: '#FFFFFF' }}
          className="w-20 h-20 rounded-full border-4 border-white/40 flex items-center justify-center group relative shadow-2xl transition-colors"
        >
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight className="w-10 h-10 text-[#FFD700] relative z-10 drop-shadow" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* 6. Social proof footer - Fades up gently */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ duration: 0.6, delay: 1.15 }}
        className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest pb-2"
      >
        <div className="flex flex-col items-center">
          <span>11 Lakh</span>
          <span className="opacity-60 text-[8px]">Members</span>
        </div>
        <div className="w-px h-4 bg-white/40"></div>
        <div className="flex flex-col items-center">
          <span>Secure</span>
          <span className="opacity-60 text-[8px]">SSL-256</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

