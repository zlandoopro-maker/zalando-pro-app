import { motion } from 'motion/react';
import Logo from './Logo';

interface Intro2Props {
  onNext: () => void;
  key?: string;
}

export default function Intro2({ onNext }: Intro2Props) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white dark:bg-[#0B0C10] flex flex-col items-center justify-center p-8 text-center overflow-hidden transition-colors duration-300 z-10"
    >
      {/* Background Subtle Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full"
        />
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 }}
        className="mb-12 relative"
      >
        <Logo className="w-40 h-40" variant="blue" />
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.4 }
          }
        }}
        className="max-w-md relative z-10"
      >
        <motion.h1 
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          className="text-4xl font-black text-gray-900 dark:text-white mb-6 leading-tight tracking-tight"
        >
          Easy to operate,<br />
          <span className="text-primary italic">Easy to earn</span>
        </motion.h1>
        
        <motion.p 
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 }
          }}
          className="text-gray-500 dark:text-slate-400 text-lg mb-12 font-medium leading-relaxed px-4"
        >
          Earning is much easier in Era of 5G, we designate the ideal platform for all users to ensure that earning is kind of lifestyle
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
        className="w-full max-w-xs relative"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          aria-label="Next screen"
          style={{ backgroundColor: '#4A69BD', color: '#FFFFFF' }}
          className="w-full py-4 px-8 rounded-2xl text-xl font-bold shadow-[0_15px_30px_rgba(74,105,189,0.4)] transition-all duration-300 flex items-center justify-center gap-3"
        >
          Next
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            →
          </motion.div>
        </motion.button>
        
        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === 1 ? 'w-8 bg-primary' : 'w-2 bg-gray-200 dark:bg-slate-700'}`}></div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
