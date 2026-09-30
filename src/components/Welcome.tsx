import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from '../lib/firebase';

interface WelcomeProps {
  onComplete: () => void;
  key?: string;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [name, setName] = useState('Partner');

  useEffect(() => {
    const fetchName = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setName(docSnap.data().displayName || auth.currentUser.displayName || 'Partner');
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
          } catch (e) {
            // Prevent crash
          }
        }
      }
    };
    fetchName();

    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white dark:bg-[#0B0C10] flex flex-col items-center justify-center p-8 text-center z-[100] overflow-hidden transition-colors duration-300"
    >
      {/* Rich Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 dark:bg-primary/10 rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 dark:bg-primary/20 rounded-full"></div>
      
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-12 relative"
      >
        <Logo className="w-40 h-40" variant="blue" />
        <div className="absolute inset-0 bg-primary/10 rounded-full scale-150"></div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <p className="text-primary text-2xl font-black italic uppercase tracking-widest opacity-80 leading-none">Welcome</p>
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{name}</h1>
        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em]">Zalando Pro Partner Hub</p>
      </motion.div>

      <div className="mt-16 flex gap-2 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.2 
            }}
            className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(74,105,189,0.5)]"
          />
        ))}
      </div>
    </motion.div>
  );
}
