import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from '../lib/firebase';
import { useNotification } from './NotificationProvider';

interface LinkedMobileProps {
  onBack: () => void;
  key?: string;
}

export default function LinkedMobile({ onBack }: LinkedMobileProps) {
  const { showNotification } = useNotification();
  const [wallet, setWallet] = useState('');
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().usdtAddress) {
          setCurrentWallet(docSnap.data().usdtAddress);
          setWallet(docSnap.data().usdtAddress);
        }
      }
    };
    fetchWallet();
  }, []);

  const handleSave = async () => {
    if (!wallet || wallet.length < 10) {
      showNotification("Please enter a valid wallet address.", { type: 'error', title: 'INVALID ADDRESS' });
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          usdtAddress: wallet
        });
        setCurrentWallet(wallet);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
          showNotification('Must be logged in to save wallet address.', { type: 'error', title: 'AUTH REQUIRED' });
      }
    } catch(err) {
      console.error(err);
      showNotification('Error updating wallet address.', { type: 'error', title: 'ERROR' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-[#F5F3FF] dark:bg-[#0B0C10] z-50 overflow-y-auto"
    >
      <div className="safe-top flex items-center p-4 bg-[#F7F5FF] dark:bg-[#15171B] border-b border-[#E8E4FF] dark:border-slate-800/50 sticky top-0 z-10 pt-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1C1E24] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase italic ml-4">Linked Wallet Address</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-[#F0EDFF] dark:bg-[#1C1E24] rounded-[2rem] p-6 shadow-sm border border-[#E8E4FF] dark:border-slate-800/50 text-center">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Bind Your TRC-20 Wallet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Link your USDT TRC-20 wallet address to ensure seamless withdrawals and deposits.</p>
        </div>

        <div className="bg-[#F0EDFF] dark:bg-[#1C1E24] rounded-[2rem] p-6 shadow-sm border border-[#E8E4FF] dark:border-slate-800/50">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">USDT (TRC-20) Address</label>
            <div className="relative">
                <input 
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value.replace(/\s/g, ''))}
                    placeholder="e.g., T..." 
                    className="w-full bg-slate-50 dark:bg-[#15171B] border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>
            
            {currentWallet && (
                <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Wallet Linked</span>
                </div>
            )}
        </div>

        <button 
            onClick={handleSave}
            disabled={loading || wallet === currentWallet}
            style={{ backgroundColor: '#10B981', color: 'white' }}
            className="w-full font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Wallet'}
        </button>

        {saved && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-2 justify-center"
            >
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Successfully saved!</span>
            </motion.div>
        )}
      </div>
    </motion.div>
  );
}
