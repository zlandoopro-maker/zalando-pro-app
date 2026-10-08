import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Mail, ShieldCheck, FileCheck, Phone, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { auth, db, parseUserProfile, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from '../lib/firebase';
import { UserProfile } from '../types';

interface PersonalInfoProps {
  onBack: () => void;
  key?: string;
}

export default function PersonalInfo({ onBack }: PersonalInfoProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // KYC Form State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userProfile = parseUserProfile(docSnap.data()) as UserProfile;
          setProfile(userProfile);
          if (userProfile.displayName && userProfile.displayName !== 'Guest User') setName(userProfile.displayName);
          if (userProfile.dob) setDob(userProfile.dob);
          if (userProfile.phone) setPhone(userProfile.phone);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!dob && !phone) {
      setError('Please provide either Date of Birth or Phone Number.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName: name.trim(),
          dob: dob.trim(),
          phone: phone.trim(),
          kycCompleted: true,
        });
        
        // Update local state
        setProfile(prev => prev ? { 
          ...prev, 
          displayName: name.trim(), 
          dob: dob.trim(), 
          phone: phone.trim(), 
          kycCompleted: true 
        } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC.');
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-[#F5F3FF] dark:bg-[#0B0C10] z-50 overflow-y-auto scroll-container"
    >
      <div className="safe-top flex items-center p-4 bg-[#F7F5FF] dark:bg-[#15171B] border-b border-[#E8E4FF] dark:border-slate-800/50 sticky top-0 z-10 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1C1E24] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase italic ml-4">Personal Information</h1>
      </div>

      <div className="p-6 space-y-4">
        {profile && !profile.kycCompleted ? (
          <div className="bg-[#F0EDFF] dark:bg-[#1C1E24] rounded-3xl p-6 shadow-sm border border-[#E8E4FF] dark:border-slate-800/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Complete KYC</h2>
                <p className="text-xs font-bold text-slate-400 capitalize">Required for deposits</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-start gap-3 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitKyc} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your real name"
                    className="w-full bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                <span className="text-[10px] font-black uppercase text-slate-400">OR</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: '#10B981', color: 'white' }}
                className="w-full mt-6 py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:active:scale-100"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit KYC Verification'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="bg-[#F0EDFF] dark:bg-[#1C1E24] rounded-3xl p-6 shadow-sm border border-[#E8E4FF] dark:border-slate-800/50 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{profile?.displayName || 'Guest User'}</h2>
                <p className="text-sm font-medium text-slate-400 capitalize mt-1 text-center">Partner Member</p>
            </div>

            {/* Info List */}
            <div className="bg-[#F0EDFF] dark:bg-[#1C1E24] rounded-3xl shadow-sm border border-[#E8E4FF] dark:border-slate-800/50 divide-y divide-[#EAE7FF] dark:divide-slate-800/50">
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{profile?.email || 'Not provided'}</p>
                    </div>
                </div>
                {profile?.phone && (
                  <div className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200">{profile.phone}</p>
                      </div>
                  </div>
                )}
                {profile?.dob && (
                  <div className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date of Birth</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200">{profile.dob}</p>
                      </div>
                  </div>
                )}
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AML Status</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">Verified</p>
                    </div>
                </div>
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <FileCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KYC Application</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">Verified</p>
                    </div>
                </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
