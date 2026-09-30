import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ComingSoonProps {
  onBack: () => void;
  key?: string;
}

export default function ComingSoon({ onBack }: ComingSoonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Background music for "Coming Soon" - Subtle/Ambient vibe
    const audio = new Audio('https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3');
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    const playAudio = () => {
      audio.play().catch(err => {
        console.log("Autoplay blocked, waiting for interaction", err);
      });
    };

    playAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center overflow-hidden z-50"
    >
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full animate-pulse"></div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onBack}
        className="absolute top-8 left-8 z-50 p-2 -m-2 text-white/50 hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest font-bold cursor-pointer"
      >
        <ArrowLeft size={18} /> Back
      </motion.button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10"
      >
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-accent text-xs font-black uppercase tracking-[0.3em] mb-12 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <img src="/logo.png" className="w-4 h-4 object-contain animate-pulse" alt="Logo" /> The Future is Here
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-none">
          <motion.span
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-block"
          >
            Zalando Pro
          </motion.span>
          <motion.span 
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            className="text-blue-500 inline-block transform -translate-y-8 ml-1"
          >
            .
          </motion.span>
          <br />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <span className="bg-gradient-to-r from-blue-400 via-white to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              PRO VERSION
            </span>
            <motion.div 
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent skew-x-12"
            />
          </motion.div>
        </h1>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-6"
        >
          <p className="text-slate-400 text-xl max-w-sm mx-auto leading-relaxed font-light">
            Unleashing the next generation of <span className="text-white font-medium">data-driven earnings</span>.
          </p>
          
          <div className="pt-16 relative">
            <motion.div
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [0.95, 1, 0.95]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-[0.4em] uppercase italic select-none">
                COMING SOON
              </h2>
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
    </motion.div>
  );
}
