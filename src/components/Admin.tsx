import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, CreditCard, Activity, AlertCircle, Search, Save, CheckCircle, XCircle, Check, QrCode, Zap } from 'lucide-react';
import { UserProfile, Transaction, Screen } from '../types';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile } from '../lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, getDocs, updateDoc, setDoc, where, addDoc, runTransaction, limit, orderBy, increment, deleteDoc } from '../lib/firebase';
import BottomNav from './BottomNav';
import { useNotification } from './NotificationProvider';
import { supabase } from '../lib/supabase';

export default function Admin({ onNavigate }: { onNavigate: (s: Screen) => void, key?: string }) {
  const { showNotification } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [payoutMode, setPayoutMode] = useState<'slow' | 'fast'>('fast');
  const [activeTab, setActiveTab] = useState<'users' | 'daily_users' | 'transactions' | 'settings' | 'financial' | 'payments'>('users');
  const [tapCount, setTapCount] = useState(0);
  const [completedTransactions, setCompletedTransactions] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [announcement, setAnnouncement] = useState('Partner brands are making record profits today...');
  const [bannerUrl, setBannerUrl] = useState('');
  const [telegramLink, setTelegramLink] = useState('https://t.me/zalando_admin');
  const [instagramLink, setInstagramLink] = useState('https://instagram.com/');
  const [youtubeLink, setYoutubeLink] = useState('https://youtube.com/');
  const [depositQrUrl, setDepositQrUrl] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [binanceQrUrl, setBinanceQrUrl] = useState('');
  const [accountProfileUrl, setAccountProfileUrl] = useState('/badges/profile_default.png');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => parseUserProfile(doc.data()) as UserProfile));
    }, (err) => {
      console.error("Admin users snapshot error:", err);
    });

    const qTx = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Admin tx snapshot error:", err);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.walletAddress) setWalletAddress(data.walletAddress);
        if (data.announcement) setAnnouncement(data.announcement);
        if (data.bannerUrl) setBannerUrl(data.bannerUrl);
        if (data.telegramLink) setTelegramLink(data.telegramLink);
        if (data.instagramLink) setInstagramLink(data.instagramLink);
        if (data.youtubeLink) setYoutubeLink(data.youtubeLink);
        if (data.depositQrUrl) setDepositQrUrl(data.depositQrUrl);
        if (data.binanceId) setBinanceId(data.binanceId);
        if (data.binanceQrUrl) setBinanceQrUrl(data.binanceQrUrl);
        if (data.accountProfileUrl) setAccountProfileUrl(data.accountProfileUrl);
      } else {
        const localWallet = localStorage.getItem('admin_wallet_address');
        if (localWallet) setWalletAddress(localWallet);
      }
    }, (err) => {
      console.error("Error fetching settings", err);
    });

    // Loophole 3 Fix: Strict Server-Side Admin Check
    const checkAdminStatus = async () => {
      if (!auth.currentUser) {
        onNavigate('auth');
        return;
      }
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || !userSnap.data().isAdmin) {
        console.error("UNAUTHORIZED ACCESS ATTEMPT");
        auth.signOut();
        onNavigate('auth');
      }
    };
    checkAdminStatus();

    return () => {
      unsubUsers();
      unsubTx();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'financial') {
      const qCompleted = query(collection(db, 'transactions'), where('status', '==', 'completed'));
      const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
        setCompletedTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("Admin completed tx snapshot error:", err);
      });
      return () => unsubCompleted();
    }
  }, [activeTab]);

  const handleCreateMasterCode = async () => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'referral_codes', 'MASTER'), {
        userId: auth.currentUser.uid
      });
      showNotification("MASTER Referral Code created successfully! Organic traffic will now be routed to you.", { type: 'success' });
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to create MASTER code. Are you an admin?", { type: 'error' });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await setDoc(doc(db, 'settings', 'global'), { 
        walletAddress,
        announcement,
        bannerUrl,
        telegramLink,
        instagramLink,
        youtubeLink,
        depositQrUrl,
        binanceId,
        binanceQrUrl,
        accountProfileUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      localStorage.setItem('admin_wallet_address', walletAddress); // fallback
      
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000); // Reset after 3 seconds
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateUserBalance = async (userId: string, amount: number) => {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, { balance: amount });
        showNotification('Balance updated successfully', { type: 'success', title: 'UPDATED' });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
  };

  const handleToggleBlock = async (user: UserProfile) => {
      showNotification(`Are you sure you want to ${user.isBlocked ? 'unblock' : 'block'} ${user.email}?`, {
        title: user.isBlocked ? 'UNBLOCK USER' : 'BLOCK USER',
        onConfirm: async () => {
          const userRef = doc(db, 'users', user.userId);
          try {
            await updateDoc(userRef, { isBlocked: !user.isBlocked });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${user.userId}`);
          }
        }
      });
  };

  const handleToggleAdmin = async (user: UserProfile) => {
      showNotification(`Are you sure you want to ${user.isAdmin ? 'remove Admin rights from' : 'make Admin'} ${user.email}?`, {
        title: user.isAdmin ? 'REMOVE ADMIN' : 'MAKE ADMIN',
        onConfirm: async () => {
          const userRef = doc(db, 'users', user.userId);
          try {
            await updateDoc(userRef, { isAdmin: !user.isAdmin });
            showNotification(`${user.email} is now ${!user.isAdmin ? 'an Admin' : 'a regular user'}`, { type: 'success', title: 'ADMIN UPDATED' });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${user.userId}`);
          }
        }
      });
  };

  const handleDeleteUser = async (user: UserProfile) => {
    showNotification(`Are you sure you want to PERMANENTLY DELETE ${user.email}? This cannot be undone.`, {
      title: 'DELETE USER',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', user.userId));
          showNotification('User deleted permanently', { type: 'success', title: 'DELETED' });
        } catch (err) {
          console.error(err);
          showNotification('Failed to delete user', { type: 'error', title: 'FAILED' });
        }
      }
    });
  };

  const handleWipeFinancials = () => {
    showNotification('Type "RESET" to permanently delete ALL transactions.', {
      title: 'WIPE FINANCIAL DATA',
      onConfirm: async () => {
        const code = prompt('Type RESET to confirm deletion of ALL transactions:');
        if (code === 'RESET') {
          try {
            const txSnap = await getDocs(collection(db, 'transactions'));
            const deletePromises = txSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            setTransactions([]);
            setCompletedTransactions([]);
            showNotification('Financial data wiped successfully.', { type: 'success', title: 'WIPED' });
          } catch (e) {
            console.error(e);
            showNotification('Failed to wipe financials.', { type: 'error', title: 'FAILED' });
          }
        }
      }
    });
  };

  const handleWipeUsers = () => {
    showNotification('Type "RESET" to permanently delete ALL users except yourself.', {
      title: 'WIPE USERS',
      onConfirm: async () => {
        const code = prompt('Type RESET to confirm deletion of ALL users:');
        if (code === 'RESET') {
          try {
            const myUid = auth.currentUser?.uid;
            const usersSnap = await getDocs(collection(db, 'users'));
            const deletePromises = usersSnap.docs
              .filter(d => d.id !== myUid)
              .map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            showNotification('Users wiped successfully.', { type: 'success', title: 'WIPED' });
          } catch (e) {
            console.error(e);
            showNotification('Failed to wipe users.', { type: 'error', title: 'FAILED' });
          }
        }
      }
    });
  };

  const handleApproveTransaction = async (tx: any) => {
    try {
      showNotification('Approving...', { type: 'info', title: 'PROCESSING' });
      
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, 'transactions', tx.id);
        const userRef = doc(db, 'users', tx.userId);
        
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) throw new Error("Transaction not found");
        if (txSnap.data().status !== 'pending') throw new Error("Transaction already processed");

        if (tx.type === 'deposit') {
          transaction.update(userRef, {
            balance: increment(Number(tx.amount) || 0)
          });
        }
        
        transaction.update(txRef, { status: 'completed', updatedAt: new Date().toISOString() });
      });

      // Also sync to Supabase so Transaction History shows "Completed"
      try {
        // Try matching by firestore_id first, then by user_id + amount + status
        const { data: matchedTxs } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', tx.userId)
          .eq('type', tx.type || 'deposit')
          .eq('status', 'pending')
          .eq('amount', Number(tx.amount) || 0)
          .limit(1);

        if (matchedTxs && matchedTxs.length > 0) {
          await supabase
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', matchedTxs[0].id);
        }
      } catch (e) {
        console.warn('[Admin] Supabase sync on approve failed (non-critical):', e);
      }

      setTransactions(transactions.filter(t => t.id !== tx.id));
      showNotification('Transaction Approved!', { type: 'success', title: 'APPROVED' });
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to approve.', { type: 'error', title: 'FAILED' });
    }
  };

  const handleRejectTransaction = async (tx: any) => {
    try {
      const reason = prompt('Enter rejection reason:');
      if (reason === null) return;
      
      showNotification('Rejecting...', { type: 'info', title: 'PROCESSING' });
      
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, 'transactions', tx.id);
        const userRef = doc(db, 'users', tx.userId);
        
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) throw new Error("Transaction not found");
        if (txSnap.data().status !== 'pending') throw new Error("Transaction already processed");

        if (tx.type === 'withdrawal') {
          transaction.update(userRef, {
            balance: increment(Number(tx.deductedAmount || tx.amount) || 0)
          });
        }
        
        transaction.update(txRef, { 
          status: 'rejected', 
          rejectionReason: reason,
          updatedAt: new Date().toISOString() 
        });
      });

      // Also sync rejection to Supabase
      try {
        const { data: matchedTxs } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', tx.userId)
          .eq('type', tx.type || 'deposit')
          .eq('status', 'pending')
          .eq('amount', Number(tx.amount) || 0)
          .limit(1);

        if (matchedTxs && matchedTxs.length > 0) {
          await supabase
            .from('transactions')
            .update({ status: 'rejected', rejection_reason: reason })
            .eq('id', matchedTxs[0].id);
        }
      } catch (e) {
        console.warn('[Admin] Supabase sync on reject failed (non-critical):', e);
      }

      setTransactions(transactions.filter(t => t.id !== tx.id));
      showNotification('Transaction Rejected!', { type: 'success', title: 'REJECTED' });
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to reject.', { type: 'error', title: 'FAILED' });
    }
  };


  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const usersToday = users.filter(u => u.createdAt && u.createdAt.startsWith(todayStr)).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[100dvh] bg-slate-100 pb-[calc(8rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="bg-primary text-white p-6 pt-[max(3rem,env(safe-area-inset-top,0px))] rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-primary-dark/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-white" />
                  <div>
                      <h1 className="text-2xl font-black uppercase tracking-tighter">Control Hub</h1>
                      <p className="text-[10px] font-bold text-white/60 tracking-[0.3em] uppercase">Zalando Pro Admin Panel</p>
                  </div>
              </div>
              <button 
                onClick={() => onNavigate('home')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95 flex items-center gap-2"
              >
                <XCircle className="w-3 h-3" />
                Exit Hub
              </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[8px] font-bold text-white/40 uppercase mb-1">Total Users</p>
                  <p className="text-xl font-black italic">{users.length}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[8px] font-bold text-white/40 uppercase mb-1">New Today</p>
                  <p className="text-xl font-black italic text-emerald-400">{usersToday}</p>
              </div>
              <div 
                className="bg-white/10 rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all active:scale-95 group"
                onClick={() => {
                  // Toggle Mode logic
                  setPayoutMode(prev => prev === 'fast' ? 'slow' : 'fast');
                  
                  // Hidden Panel logic (7 taps)
                  setTapCount(prev => {
                    const next = prev + 1;
                    if (next >= 7) {
                      setActiveTab('financial');
                      showNotification('Financial Panel Unlocked', { type: 'success', title: 'SECRET UNLOCKED' });
                      return 0;
                    }
                    return next;
                  });
                }}
              >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[8px] font-bold text-white/40 uppercase">Payout Mode</p>
                    <motion.div
                      animate={{ scale: payoutMode === 'fast' ? [1, 1.2, 1] : 1 }}
                      transition={{ repeat: payoutMode === 'fast' ? Infinity : 0, duration: 1.5 }}
                    >
                      <Zap className={`w-3 h-3 ${payoutMode === 'fast' ? 'text-amber-400' : 'text-slate-400'}`} />
                    </motion.div>
                  </div>
                  <p className={`text-xl font-black italic uppercase ${payoutMode === 'fast' ? 'text-amber-400' : 'text-white'}`}>
                    {payoutMode}
                  </p>
                  {tapCount > 0 && tapCount < 7 && (
                    <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 transition-all" style={{ width: `${(tapCount/7)*100}%` }} />
                  )}
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[8px] font-bold text-white/40 uppercase mb-1">Pending Txs</p>
                  <p className="text-xl font-black italic text-rose-500">{transactions.length}</p>
              </div>
          </div>
      </div>

      <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveTab('daily_users')}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === 'daily_users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Daily Users
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pending Txs
            </button>
            <button 
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === 'payments' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Payments
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              App Info
            </button>
          </div>

          {activeTab === 'daily_users' && (
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black italic text-slate-800">Daily Registered Users</h3>
                </div>

                <div className="space-y-3">
                    {users.filter(u => u.createdAt?.startsWith(todayStr)).length === 0 ? (
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center shadow-sm">
                            <p className="text-sm font-bold text-slate-400">No users registered today yet.</p>
                        </div>
                    ) : (
                        users.filter(u => u.createdAt?.startsWith(todayStr)).map(user => (
                            <div key={user.userId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2">
                                    <span className="bg-emerald-100/50 text-emerald-600 text-[8px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold">New Today</span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{user.displayName || 'No Name'}</h4>
                                        <p className="text-[10px] text-slate-400">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Joined At</p>
                                        <p className="text-sm font-black italic text-slate-700">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Balance</p>
                                        <p className="text-sm font-black italic text-primary">${user.balance?.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
          )}

          {activeTab === 'users' && (
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black italic text-slate-800">User Management</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.userId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            {user.displayName || 'No Name'}
                                            {user.isAdmin && <span className="bg-indigo-100 text-indigo-600 text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-widest leading-none font-black flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Admin</span>}
                                            {user.createdAt?.startsWith(todayStr) && <span className="bg-emerald-100/50 text-emerald-600 text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-widest leading-none">New</span>}
                                        </h4>
                                        <p className="text-[10px] text-slate-400">{user.email}</p>
                                        {user.usdtAddress && (
                                          <p className="text-[8px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded mt-1 inline-block truncate max-w-[150px]">
                                            {user.usdtAddress}
                                          </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Balance</p>
                                    <p className="font-black text-primary">${(user.balance || 0).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                  onClick={() => handleToggleAdmin(user)}
                                  className={`flex-1 min-w-[30%] py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 ${user.isAdmin ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <Shield className="w-3 h-3" />
                                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                <button 
                                  onClick={() => {
                                      const amount = prompt('Enter new balance:', (user.balance || 0).toString());
                                      if (amount !== null) {
                                        const parsed = parseFloat(amount);
                                        if (!isNaN(parsed)) {
                                          updateUserBalance(user.userId, parsed);
                                        } else {
                                          showNotification("Invalid amount", { type: 'error', title: 'ERROR' });
                                        }
                                      }
                                  }}
                                  className="flex-1 min-w-[30%] py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CreditCard className="w-3 h-3" />
                                    Edit Balance
                                </button>
                                <button 
                                  onClick={() => handleToggleBlock(user)}
                                  className={`flex-1 min-w-[30%] py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 ${user.isBlocked ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-slate-50 text-rose-500 hover:bg-rose-100'}`}
                                >
                                    {user.isBlocked ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {user.isBlocked ? 'Unblock' : 'Block User'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user)}
                                  className="flex-1 min-w-[30%] py-2 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
          )}

          {activeTab === 'transactions' && (
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black italic text-slate-800">Pending Transactions</h3>
                </div>

                <div className="space-y-3">
                    {transactions.length === 0 && (
                      <p className="text-center text-slate-400 font-bold py-8 uppercase text-xs tracking-widest">No pending transactions</p>
                    )}
                    {transactions.map(tx => {
                        const user = users.find(u => u.userId === tx.userId);
                        return (
                          <div key={tx.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                                          {tx.type === 'deposit' ? 'D' : 'W'}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-800 text-sm uppercase">{tx.type}</h4>
                                          <p className="text-[10px] text-slate-400">{user?.email || 'Unknown User'}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[8px] font-bold text-slate-400 uppercase">Amount</p>
                                      <p className={`font-black ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                        ${(tx.amount || 0).toFixed(2)}
                                      </p>
                                      {tx.type === 'withdrawal' && (
                                        <p className="text-[7px] text-slate-300 font-bold uppercase mt-0.5">Incl. 5% Fee: ${(tx.deductedAmount || tx.amount * 1.05).toFixed(2)}</p>
                                      )}
                                  </div>
                              </div>
                              {(tx.walletAddress || tx.userUsdtAddress) && (
                                  <div className={`mb-4 p-3 rounded-lg border break-all ${tx.type === 'withdrawal' ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">
                                        {tx.type === 'withdrawal' ? "Destination TRC-20 Address" : "Sender's Linked TRC-20 Address"}
                                      </p>
                                      <p className="font-mono text-xs text-slate-700">{tx.walletAddress || tx.userUsdtAddress}</p>
                                  </div>
                              )}
                              {tx.type === 'deposit' && tx.orderId && (
                                  <div className="mb-4 p-3 rounded-lg border bg-blue-50/50 border-blue-100">
                                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Transaction / Order ID</p>
                                      <div className="flex items-center justify-between">
                                          <p className="font-mono text-xs text-blue-600 font-bold">{tx.orderId}</p>
                                          <span className="bg-blue-100 text-blue-600 text-[8px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold">
                                            {tx.paymentMethod === 'binance' ? 'Binance Pay' : 'USDT-TRC20'}
                                          </span>
                                      </div>
                                  </div>
                              )}
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleApproveTransaction(tx)}
                                    className="flex-1 py-2 bg-emerald-50 text-emerald-600 outline-none text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <CheckCircle className="w-3 h-3" />
                                      Approve
                                  </button>
                                  <button 
                                    onClick={() => handleRejectTransaction(tx)}
                                    className="flex-1 py-2 bg-slate-50 text-rose-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <XCircle className="w-3 h-3" />
                                      Reject
                                  </button>
                              </div>
                          </div>
                      )
                    })}
                </div>
            </section>
          )}

          {activeTab === 'payments' && (
             <section className="space-y-4">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-black italic text-slate-800 uppercase tracking-tighter">Payment Methods</h3>
               </div>
               
               <div className="space-y-6">
                 {/* TRC20 Wallet */}
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">USDT (TRC20) Settings</h4>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Wallet Address</label>
                      <input 
                        type="text" 
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="TR7NHqj...Lj6t"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Wallet QR Code</label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl p-4 transition-all text-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setDepositQrUrl(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                          <QrCode className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Change TRC20 QR</span>
                        </label>
                        {depositQrUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                            <img src={depositQrUrl} className="w-full h-full object-cover" alt="TRC20 QR" />
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 {/* Binance Pay */}
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-black rounded-xl overflow-hidden shrink-0">
                          <svg viewBox="0 0 201 201" className="w-5 h-5">
                            <path fill="#F3BA2F" d="M126.452 111.118L141.537 126.159L100.531 167.121L59.5688 126.159L74.6533 111.118L100.531 136.995L126.452 111.118ZM100.531 85.1965L115.832 100.498L100.531 115.799L85.2732 100.541V100.498L87.9607 97.8103L89.2611 96.5099L100.531 85.1965ZM48.949 85.4133L64.0335 100.498L48.949 115.539L33.8644 100.454L48.949 85.4133ZM152.113 85.4133L167.198 100.498L152.113 115.539L137.029 100.454L152.113 85.4133ZM100.531 33.8311L141.493 74.7934L126.409 89.8779L100.531 63.9568L74.6533 89.8346L59.5688 74.7934L100.531 33.8311Z"/>
                          </svg>
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Binance Pay Settings</h4>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Binance ID (Pay ID)</label>
                      <input 
                        type="text" 
                        value={binanceId}
                        onChange={(e) => setBinanceId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="e.g. 876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Binance Pay QR Code</label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl p-4 transition-all text-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setBinanceQrUrl(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                          <QrCode className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Change Binance QR</span>
                        </label>
                        {binanceQrUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                            <img src={binanceQrUrl} className="w-full h-full object-cover" alt="Binance QR" />
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <button 
                   onClick={handleSaveSettings}
                   disabled={savingSettings}
                   className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all ${
                     settingsSaved ? 'bg-emerald-500' : 'bg-slate-900 active:scale-95'
                   } disabled:opacity-50`}
                 >
                   {savingSettings ? 'Saving Changes...' : settingsSaved ? 'All Payment Info Saved!' : 'Update Payment Methods'}
                 </button>
               </div>
             </section>
          )}

          {activeTab === 'settings' && (
             <section className="space-y-4">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-black italic text-slate-800">App Configuration</h3>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Home Page Announcement (Marquee)</label>
                    <textarea 
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter the message you want users to see..."
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Banner Image URL</label>
                    <input 
                      type="text"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/banner.jpg"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Account Profile Photo URL</label>
                     <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          value={accountProfileUrl}
                          onChange={(e) => setAccountProfileUrl(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="/badges/profile_default.png"
                        />
                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
                          <img 
                            src={accountProfileUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                            onError={(e) => (e.currentTarget.src = '/badges/profile_default.png')} 
                          />
                        </div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Social Links (Telegram/Instagram/YouTube)</label>
                    <div className="space-y-3">
                      <input type="text" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs" placeholder="Telegram Link" />
                      <input type="text" value={instagramLink} onChange={(e) => setInstagramLink(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs" placeholder="Instagram Link" />
                      <input type="text" value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs" placeholder="YouTube Link" />
                    </div>
                 </div>

                 <button 
                   onClick={handleSaveSettings}
                   disabled={savingSettings}
                   className={`w-full py-3 text-white rounded-xl font-bold uppercase tracking-widest text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
                     settingsSaved ? 'bg-green-500' : 'bg-slate-900'
                   } disabled:opacity-70`}
                 >
                   {savingSettings ? 'Saving...' : settingsSaved ? 'Saved Successfully' : 'Save App Info'}
                 </button>

                 <div className="pt-6 border-t border-slate-100 mt-6">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">System Tools</h4>
                    <button
                      onClick={handleCreateMasterCode}
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 active:scale-95 transition-all mb-4"
                    >
                      <Users className="w-4 h-4" />
                      Initialize MASTER Referral Code
                    </button>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Notification Broadcast</h4>
                    <button
                      onClick={async () => {
                        const title = prompt('Notification Title:', '🌟 New Tasks Available!');
                        const body = prompt('Notification Message:', 'Daily tasks have been reset. Come and earn your rewards!');
                        if (!title || !body) return;

                        try {
                          const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
                          const res = await fetch(`${baseUrl}/api/admin/broadcast`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title, body,
                              adminSecret: localStorage.getItem('admin_secret') || 'default_secret'
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            showNotification(`Broadcast sent to ${data.sentCount} devices!`, { type: 'success', title: 'SENT' });
                          } else {
                            throw new Error(data.error);
                          }
                        } catch (e: any) {
                          showNotification(e.message || 'Broadcast failed', { type: 'error' });
                        }
                      }}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                      <Activity className="w-4 h-4" />
                      Broadcast to All Users
                    </button>
                 </div>
               </div>
             </section>
          )}

          {activeTab === 'financial' && (
             <section className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black italic text-slate-800">Financial Overview</h3>
                    <button 
                      onClick={() => setActiveTab('users')}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-slate-800 transition-colors"
                    >
                      Close
                    </button>
                </div>
                
                {(() => {
                  const totalDeposits = completedTransactions
                    .filter(tx => tx.type === 'deposit')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
                    
                  const totalWithdrawals = completedTransactions
                    .filter(tx => tx.type === 'withdrawal')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
                    
                  const remainingCapital = totalDeposits - totalWithdrawals;

                  const totalCommissionsPaid = completedTransactions
                    .filter(tx => tx.type === 'commission')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

                  const totalSystemLiability = users.reduce((sum, u) => sum + (u.balance || 0), 0);
                  const pendingWithdrawals = transactions
                    .filter(tx => tx.type === 'withdrawal')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
                  
                  const trueSolvency = remainingCapital - totalSystemLiability;

                  const todaysDeposits = completedTransactions
                    .filter(tx => tx.type === 'deposit' && (tx.processedAt?.startsWith(todayStr) || tx.timestamp?.startsWith(todayStr)))
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

                  const todaysWithdrawals = completedTransactions
                    .filter(tx => tx.type === 'withdrawal' && (tx.processedAt?.startsWith(todayStr) || tx.timestamp?.startsWith(todayStr)))
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

                  return (
                    <div className="space-y-6 pb-4">
                      {/* Section 1: Core Capital */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Core Capital</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mb-0.5">Total Deposit Capital</p>
                                  <p className="text-2xl font-black text-emerald-600 italic">${totalDeposits.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-bold text-rose-600/60 uppercase tracking-widest mb-0.5">Total Withdrawal Approved</p>
                                  <p className="text-2xl font-black text-rose-600 italic">${totalWithdrawals.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-md flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Remaining Admin Capital</p>
                                  <p className={`text-2xl font-black italic ${remainingCapital >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                    ${remainingCapital.toFixed(2)}
                                  </p>
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* Section 2: Liabilities & Solvency */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Liabilities & Solvency</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total System Liability</p>
                                <p className="text-lg font-black text-slate-800 italic">${totalSystemLiability.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Withdrawals</p>
                                <p className="text-lg font-black text-blue-500 italic">${pendingWithdrawals.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Commissions</p>
                                <p className="text-lg font-black text-indigo-500 italic">${totalCommissionsPaid.toFixed(2)}</p>
                            </div>
                            <div className={`p-4 rounded-2xl border shadow-sm ${trueSolvency >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-rose-50 border-rose-100'}`}>
                                <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${trueSolvency >= 0 ? 'text-primary' : 'text-rose-500'}`}>True Solvency</p>
                                <p className={`text-lg font-black italic ${trueSolvency >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                  ${trueSolvency.toFixed(2)}
                                </p>
                            </div>
                        </div>
                      </div>

                      {/* Section 3: Today's Velocity */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Today's Velocity</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Deposits</p>
                                <p className="text-lg font-black text-emerald-500 italic">+${todaysDeposits.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Withdrawals</p>
                                <p className="text-lg font-black text-rose-500 italic">-${todaysWithdrawals.toFixed(2)}</p>
                            </div>
                        </div>
                      </div>

                      {/* Section 4: System Reset */}
                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Danger Zone
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={handleWipeFinancials}
                              className="w-full py-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors flex flex-col items-center gap-2"
                            >
                                <Activity className="w-5 h-5" />
                                Wipe All Financial Data
                            </button>
                            <button 
                              onClick={handleWipeUsers}
                              className="w-full py-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors flex flex-col items-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                Wipe All Users
                            </button>
                        </div>
                      </div>

                    </div>
                  );
                })()}
             </section>
          )}

      </div>
    </motion.div>
  );
}
