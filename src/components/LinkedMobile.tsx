import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from '../lib/firebase';
import { useNotification } from './NotificationProvider';

interface LinkedMobileProps {
  onBack: () => void;
  key?: string;
}

export default function LinkedMobile({ onBack }: LinkedMobileProps) {
  const { showNotification } = useNotification();
  const [phone, setPhone] = useState('');
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchPhone = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().phone) {
          setCurrentPhone(docSnap.data().phone);
          setPhone(docSnap.data().phone);
        }
      }
    };
    fetchPhone();
  }, []);

  const handleSave = async () => {
    if (!phone || phone.length < 5) {
      showNotification("Please enter a valid phone number.", { type: 'error', title: 'INVALID NUMBER' });
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          phone: phone
        });
        setCurrentPhone(phone);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
          showNotification('Must be logged in to save phone number.', { type: 'error', title: 'AUTH REQUIRED' });
      }
    } catch(err) {
      console.error(err);
      showNotification('Error updating phone number.', { type: 'error', title: 'ERROR' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-[#F8F9FD] dark:bg-[#0B0C10] z-50 overflow-y-auto"
    >
      <div className="safe-top flex items-center p-4 bg-white dark:bg-[#15171B] border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-10 pt-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1C1E24] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase italic ml-4">Linked Mobile Number</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-[#1C1E24] rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800/50 text-center">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Bind Your Mobile Number</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Link your phone number to secure your account and receive important updates.</p>
        </div>

        <div className="bg-white dark:bg-[#1C1E24] rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800/50">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Mobile Number</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+</span>
                <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter phone number" 
                    className="w-full bg-slate-50 dark:bg-[#15171B] border border-slate-200 dark:border-slate-700/50 rounded-2xl pl-10 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>
            
            {currentPhone && (
                <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Number Verified</span>
                </div>
            )}
        </div>

        <button 
            onClick={handleSave}
            disabled={loading || phone === currentPhone}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
        >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Number'}
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
