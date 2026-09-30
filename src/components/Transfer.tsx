import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, runTransaction } from '../lib/firebase';
import { useNotification } from './NotificationProvider';

interface TransferProps {
  onBack: () => void;
  key?: string;
}

export default function Transfer({ onBack }: TransferProps) {
  const { showNotification } = useNotification();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBalance(docSnap.data().balance || 0);
          setProfile(docSnap.data());
        }
      }
    };
    fetchBalance();
  }, []);

  const handleTransfer = async () => {
    if (!profile || !['senior', 'regional', 'reg_gen'].includes(profile.currentPlan || '')) {
      showNotification('Transfer is only available for Senior Manager and above.', { type: 'error', title: 'NOT ELIGIBLE' });
      return;
    }

    const amt = parseFloat(amount);
    if (!recipient.trim() || isNaN(amt) || amt <= 0) {
      showNotification('Please enter a valid recipient and amount.', { type: 'error', title: 'INVALID INPUT' });
      return;
    }
    if (amt > balance) {
      showNotification('Insufficient balance.', { type: 'error', title: 'INSUFFICIENT' });
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) {
          showNotification('You must be logged in to transfer funds.', { type: 'error', title: 'AUTH REQUIRED' });
          setLoading(false);
          return;
      }
      // 1. Find recipient by email or referralCode
      const usersRef = collection(db, 'users');
      let recipientQuery = query(usersRef, where('email', '==', recipient.toLowerCase().trim()));
      let recipientSnap = await getDocs(recipientQuery);

      if (recipientSnap.empty) {
        recipientQuery = query(usersRef, where('referralCode', '==', recipient.toUpperCase().trim()));
        recipientSnap = await getDocs(recipientQuery);
      }

      if (recipientSnap.empty) {
        showNotification('Recipient not found.', { type: 'error', title: 'NOT FOUND' });
        setLoading(false);
        return;
      }

      const recipientDoc = recipientSnap.docs[0];
      if (recipientDoc.id === auth.currentUser.uid) {
        showNotification('You cannot transfer to yourself.', { type: 'error', title: 'ERROR' });
        setLoading(false);
        return;
      }

      // 2. Perform atomic transfer
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const recipientUserRef = doc(db, 'users', recipientDoc.id);

      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(currentUserRef);
        const recipientSnap = await transaction.get(recipientUserRef);
        
        if (!senderSnap.exists() || !recipientSnap.exists()) {
          throw new Error("User accounts not found");
        }
        
        const senderBalance = senderSnap.data().balance || 0;
        const recipientBalance = recipientSnap.data().balance || 0;
        
        if (senderBalance < amt) {
          throw new Error("Insufficient balance during transfer");
        }
        
        transaction.update(currentUserRef, {
          balance: senderBalance - amt
        });
        
        transaction.update(recipientUserRef, {
          balance: recipientBalance + amt
        });
        
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: auth.currentUser!.uid,
          recipientId: recipientDoc.id,
          amount: amt,
          type: 'transfer',
          status: 'completed',
          timestamp: new Date().toISOString()
        });
      });

      showNotification(`Successfully transferred $${amt.toFixed(2)} to ${recipientDoc.data().displayName || recipient}.`, { type: 'success', title: 'SUCCESS' });
      setBalance(balance - amt);
      setAmount('');
      setRecipient('');
    } catch (error) {
      console.error(error);
      showNotification('An error occurred during transfer.', { type: 'error', title: 'ERROR' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-[#F8F9FD] dark:bg-[#0B0C10] z-50 overflow-y-auto"
    >
      <div className="safe-top flex items-center p-4 bg-white dark:bg-[#15171B] border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-10 pt-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1C1E24] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase italic ml-4">Transfer Funds</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-[#1C1E24] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/50 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available Balance</p>
            <h2 className="text-4xl font-black text-slate-800 dark:text-white">${balance.toFixed(2)}</h2>
        </div>

        <div className="bg-white dark:bg-[#1C1E24] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/50 space-y-4">
            <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Recipient Email or Referral Code</label>
                 <input 
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter email or code"
                    className="w-full bg-slate-50 dark:bg-[#15171B] border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                 />
            </div>
            <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amount to Transfer</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                    <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 dark:bg-[#15171B] border border-slate-200 dark:border-slate-700/50 rounded-2xl pl-10 pr-4 py-4 font-black text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-xl"
                    />
                 </div>
            </div>
        </div>

        <button 
           onClick={handleTransfer}
           disabled={loading}
           className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/25 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
           {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
           ) : (
             <>
                <Send className="w-5 h-5" />
                Proceed with Transfer
             </>
           )}
        </button>
      </div>
    </motion.div>
  );
}
