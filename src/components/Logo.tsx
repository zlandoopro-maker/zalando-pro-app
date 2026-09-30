import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  variant?: 'white' | 'blue';
}

export default function Logo({ className = "w-48 h-48", variant = 'blue' }: LogoProps) {
  const imgSrc = variant === 'white' ? "/logo_white.png" : "/logo.png";
  
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img 
          src={imgSrc} 
          alt="App Logo" 
          className="w-full h-full object-contain"
        />
      </motion.div>
    </div>
  );
}
