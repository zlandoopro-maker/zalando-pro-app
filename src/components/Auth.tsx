import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db, googleProvider, handleFirestoreError, OperationType, resetAuthSystem, verifyClockIntegrity } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInAnonymously, sendPasswordResetEmail } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, query, collection, where, getDocs } from '../lib/firebase';
import { Mail, Lock, AlertCircle, Loader2, UserPlus, Eye, EyeOff, User } from 'lucide-react';
import Logo from './Logo';
import { useNotification } from './NotificationProvider';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

interface AuthProps {
  onSuccess: () => void;
  key?: string;
}

export default function Auth({ onSuccess }: AuthProps) {
  const { showNotification } = useNotification();
  const isReferralCodeLocked = !!localStorage.getItem('referral_code');
  const [isLogin, setIsLogin] = useState(!isReferralCodeLocked);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState(() => localStorage.getItem('referral_code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  const processReferralIfAny = async (user: any) => {
    let referrerId = null;
    let codeToUse = referralCodeInput.trim().toUpperCase();
    
    // Fallback to localStorage if manual input is empty
    if (!codeToUse) {
      codeToUse = localStorage.getItem('referral_code') || '';
    }

    // --- AUTOMATIC REFERRAL FALLBACK ---
    // If the user has no link, automatically assign them to the master admin.
    if (!codeToUse) {
      // REPLACE "MASTER" WITH YOUR ACTUAL ADMIN REFERRAL CODE!
      codeToUse = 'MASTER'; 
    }

    if (codeToUse.length > 0) {
      try {
        const codeDoc = await getDoc(doc(db, 'referral_codes', codeToUse));
        if (codeDoc.exists()) {
          referrerId = codeDoc.data().userId;
          
          // Anti-Fraud: Block self-referral
          if (referrerId === user.uid) {
            console.warn("Self-referral blocked");
            return null;
          }

          if (referrerId) {
            let l2ReferrerId = null;
            let l3ReferrerId = null;
            
            try {
              const parentRefSnap = await getDoc(doc(db, 'referrals', referrerId));
              if (parentRefSnap.exists()) {
                const parentData = parentRefSnap.data();
                l2ReferrerId = parentData.referrerId || null;
                l3ReferrerId = parentData.l2ReferrerId || null;
              }
            } catch (err) {
              console.error("Failed to fetch L2/L3 referrers", err);
            }

            await setDoc(doc(db, 'referrals', user.uid), {
               referrerId,
               l2ReferrerId,
               l3ReferrerId,
               inviteeId: user.uid,
               inviteeName: user.displayName || user.email || 'Partner',
               planType: 'None',
               commissionEarned: 0,
               timestamp: new Date().toISOString(),
               status: 'pending' // New status for funnel tracking
            });
            // Clear used code
            localStorage.removeItem('referral_code');
          }
        }
      } catch (err) {
        console.error("Failed to process referral code:", err);
      }
    }
    return referrerId;
  };

  const createInitialUserDocs = async (user: any, baseData: any) => {
    const userDocPath = `users/${user.uid}`;
    try {
      const code = user.uid.substring(0, 6).toUpperCase();
      const referrerId = await processReferralIfAny(user);
      
      await setDoc(doc(db, 'users', user.uid), {
         ...baseData,
         referralCode: code,
         referredBy: referrerId
      });
      // Save mapping
      try {
        await setDoc(doc(db, 'referral_codes', code), { userId: user.uid });
      } catch (e) {
        // Not critical if fails
      }
    } catch (setErr) {
      handleFirestoreError(setErr, OperationType.WRITE, userDocPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isForgotPassword && !password)) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !isForgotPassword) {
      const cleanUsername = username.trim();
      if (!cleanUsername) {
        setError('Please enter a unique username');
        return;
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        setError('Username must be 3-20 characters and contain only letters, numbers, or underscores.');
        return;
      }
    }

    setLoading(true);
    setError('');

    if (auth.currentUser) {
      await auth.signOut();
    }
    localStorage.removeItem('zp_clock_strikes');

    // --- OPTIMIZED TIME CHECK: Await so clock tampering actually blocks login ---
    const isClockOk = await verifyClockIntegrity((msg) => setError(msg));
    if (!isClockOk) { setLoading(false); return; }

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        showNotification("Password reset email sent! Please check your inbox.", { type: 'success' });
        setIsForgotPassword(false);
        setIsLogin(true);
        setLoading(false);
        return;
      }

      if (isLogin) {
        let loginEmail = email.trim();

        // If user typed a username instead of email (no @ character)
        if (!loginEmail.includes('@')) {
          const lowerUser = loginEmail.toLowerCase();
          try {
            const qName = query(collection(db, 'users'), where('usernameLower', '==', lowerUser));
            const snapName = await getDocs(qName);
            if (!snapName.empty) {
              loginEmail = snapName.docs[0].data().email || loginEmail;
            } else {
              setError(`No account found with username "${loginEmail}".`);
              setLoading(false);
              return;
            }
          } catch (e) {
            setError(`Please enter your email address to sign in.`);
            setLoading(false);
            return;
          }
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
        const postLoginClockOk = await verifyClockIntegrity((msg) => setError(msg));
        if (!postLoginClockOk) {
          await auth.signOut();
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', userCredential.user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const rawUserData = userDoc.data();
            const isBlocked = Boolean(
              rawUserData.is_blocked === true ||
              rawUserData.isBlocked === true ||
              String(rawUserData.block_reason ?? rawUserData.ban_reason ?? '').trim().length > 0
            );

            if (isBlocked) {
              await auth.signOut();
              setError("Your account has been permanently blocked due to time tampering or a security violation.");
              setLoading(false);
              return;
            }
            if (referralCodeInput.trim() && !rawUserData.referredBy && !rawUserData.referred_by) {
              const referrerId = await processReferralIfAny(userCredential.user);
              if (referrerId) {
                await updateDoc(userDocRef, { referredBy: referrerId });
              }
            }
          } else {
            // Auto-heal: create profile if it's missing for an existing auth user
            const user = userCredential.user;
            await createInitialUserDocs(user, {
              userId: user.uid,
              email: user.email,
              balance: 0,
              currentPlan: 'none',
              isAdmin: false,
              createdAt: new Date().toISOString(),
              todayTeamEarnings: 0,
              todayTaskEarnings: 0,
              totalEarnings: 0,
              tasksCompletedCount: 0,
              completedDaysCount: 0,
              displayName: user.displayName || '',
              phone: '',
              dob: '',
              kycCompleted: false,
              deviceSignature: `${navigator.userAgent}_${window.screen.width}x${window.screen.height}`,
              ipHint: 'pending'
            });
          }
        } catch (e) {
          // allow through, or handle error
        }
      } else {
        const cleanUsername = username.trim();
        const lowerUsername = cleanUsername.toLowerCase();

        // Safe pre-check (swallow permission error if unauthenticated query is disallowed by rules)
        try {
          const uQuery = query(collection(db, 'users'), where('usernameLower', '==', lowerUsername));
          const uSnap = await getDocs(uQuery);
          if (!uSnap.empty) {
            setError(`Username "@${cleanUsername}" is already taken. Please choose another username.`);
            setLoading(false);
            return;
          }
        } catch (permissionErr) {
          // Pre-check skipped due to unauthenticated Security Rules restriction
        }

        // Flag to prevent App.tsx auto-healer from racing
        sessionStorage.setItem('is_registering', 'true');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const postSignupClockOk = await verifyClockIntegrity((msg) => setError(msg));
        if (!postSignupClockOk) {
          await auth.signOut();
          sessionStorage.removeItem('is_registering');
          setLoading(false);
          return;
        }

        const user = userCredential.user;

        // Post-auth uniqueness verification (User is NOW AUTHENTICATED, so query is guaranteed allowed)
        try {
          const postQuery = query(collection(db, 'users'), where('usernameLower', '==', lowerUsername));
          const postSnap = await getDocs(postQuery);
          const takenByOther = postSnap.docs.filter(d => d.id !== user.uid);
          if (takenByOther.length > 0) {
            sessionStorage.removeItem('is_registering');
            await user.delete();
            await auth.signOut();
            setError(`Username "@${cleanUsername}" is already taken. Please choose another username.`);
            setLoading(false);
            return;
          }
        } catch (checkErr) {
          console.warn("Post-auth username verification warning:", checkErr);
        }
        
        // Initialize user profile in Firestore with unique username
        await createInitialUserDocs(user, {
           userId: user.uid,
           email: user.email,
           username: cleanUsername,
           usernameLower: lowerUsername,
           balance: 0,
           currentPlan: 'none', // default plan
           isAdmin: false,
           createdAt: new Date().toISOString(),
           todayTeamEarnings: 0,
           todayTaskEarnings: 0,
           totalEarnings: 0,
           tasksCompletedCount: 0,
           completedDaysCount: 0,
           displayName: cleanUsername,
           phone: '',
           dob: '',
           kycCompleted: false,
           deviceSignature: `${navigator.userAgent}_${window.screen.width}x${window.screen.height}`,
           ipHint: 'pending'
        });
        sessionStorage.removeItem('is_registering');
      }
      onSuccess();
    } catch (err: any) {
      let errorMessage = err.message || 'Authentication failed';
      try {
        const parsedError = JSON.parse(err.message);
        if (parsedError.error?.includes('offline')) {
          errorMessage = "Unable to connect to the database. Please check if Firestore is provisioned in your Firebase console.";
        }
      } catch (e) {
        // Not a JSON error
      }
      if (err.code === 'auth/invalid-credential') errorMessage = 'Invalid email or password';
      if (err.code === 'auth/email-already-in-use') errorMessage = 'Email is already registered';
      if (err.code === 'auth/weak-password') errorMessage = 'Password should be at least 6 characters';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
      localStorage.removeItem('zp_clock_strikes');

      const isClockOk = await verifyClockIntegrity((msg) => setError(msg));
      if (!isClockOk) {
        setLoading(false);
        return;
      }

      let user;
      
      if (Capacitor.isNativePlatform()) {
        const result = await GoogleSignIn.signIn();
        if (!result.idToken) {
          throw new Error("No ID Token returned from native Google Sign-in.");
        }
        user = auth.currentUser;
      } else {
        await signInWithPopup(auth, googleProvider);
        user = auth.currentUser;
      }

      const postLoginClockOk = await verifyClockIntegrity((msg) => setError(msg));
      if (!postLoginClockOk) {
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      const userDocPath = `users/${user.uid}`;
      const userDocRef = doc(db, 'users', user.uid);
      
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (getErr) {
        handleFirestoreError(getErr, OperationType.GET, userDocPath);
      }

      if (userDoc?.exists()) {
        const rawUserData = userDoc.data();
        const isBlocked = Boolean(
          rawUserData.is_blocked === true ||
          rawUserData.isBlocked === true ||
          String(rawUserData.block_reason ?? rawUserData.ban_reason ?? '').trim().length > 0
        );
        if (isBlocked) {
          await auth.signOut();
          setError("Your account has been permanently blocked due to time tampering or a security violation.");
          setLoading(false);
          return;
        }
      }

      if (!userDoc?.exists()) {
          await createInitialUserDocs(user, {
            userId: user.uid,
            email: user.email,
            balance: 0,
            currentPlan: 'none', // default plan
            isAdmin: false,
            createdAt: new Date().toISOString(),
            todayTeamEarnings: 0,
            todayTaskEarnings: 0,
            totalEarnings: 0,
            tasksCompletedCount: 0,
            completedDaysCount: 0,
            displayName: user.displayName || '',
            phone: '',
            dob: '',
            kycCompleted: false,
            deviceSignature: `${navigator.userAgent}_${window.screen.width}x${window.screen.height}`,
            ipHint: 'pending'
          });
      }
      onSuccess();
    } catch (err: any) {
      let errorMessage = err.message || 'Google authentication failed';
      let isOffline = false;
      try {
        const parsedError = JSON.parse(err.message);
        if (parsedError.error?.includes('offline')) {
          isOffline = true;
          errorMessage = "Unable to connect to the database. This usually means Firestore is not provisioned or Authorized Domains are missing in Firebase Console.";
        }
      } catch (e) {
        // Not a JSON error
      }
      
      if (err.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign in cancelled';
      } else if (err.code === 'auth/unauthorized-domain') {
          errorMessage = `Google Sign-In is not authorized for "${window.location.hostname}". Please add this domain to "Authorized domains" in Firebase Console > Authentication > Settings.`;
      } else if (err.code === 'auth/account-exists-with-different-credential') {
          errorMessage = 'An account already exists with the same email address but different sign-in credentials. Please sign in using your original method (e.g., Email/Password).';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
      localStorage.removeItem('zp_clock_strikes');

      const isClockOk = await verifyClockIntegrity((msg) => setError(msg));
      if (!isClockOk) {
        setLoading(false);
        return;
      }

      let user;
      try {
        const result = await signInAnonymously(auth);
        user = result.user;
      } catch (anonErr: any) {
        if (anonErr.code === 'auth/operation-not-allowed') {
          // Fallback to email/password if anonymous is not enabled
          const randomString = Math.random().toString(36).substring(2, 10);
          const guestEmail = `guest_${randomString}@guest.local`;
          const guestPassword = `guest_${randomString}_pwd123!`;
          const result = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
          user = result.user;
        } else {
          throw anonErr;
        }
      }

      const postLoginClockOk = await verifyClockIntegrity((msg) => setError(msg));
      if (!postLoginClockOk) {
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      const userDocPath = `users/${user.uid}`;
      const userDocRef = doc(db, 'users', user.uid);
      
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (getErr) {
        handleFirestoreError(getErr, OperationType.GET, userDocPath);
      }

      if (userDoc?.exists()) {
        const rawUserData = userDoc.data();
        const isBlocked = Boolean(
          rawUserData.is_blocked === true ||
          rawUserData.isBlocked === true ||
          String(rawUserData.block_reason ?? rawUserData.ban_reason ?? '').trim().length > 0
        );
        if (isBlocked) {
          await auth.signOut();
          setError("Your account has been permanently blocked due to time tampering or a security violation.");
          setLoading(false);
          return;
        }
      }

      if (!userDoc?.exists()) {
         await createInitialUserDocs(user, {
            userId: user.uid,
            email: `guest_${user.uid.substring(0, 5)}@guest.local`,
            balance: 0,
            currentPlan: 'none', // default plan
            isAdmin: false,
            createdAt: new Date().toISOString(),
            todayTeamEarnings: 0,
            todayTaskEarnings: 0,
            totalEarnings: 0,
            tasksCompletedCount: 0,
            completedDaysCount: 0,
            displayName: 'Guest User',
            phone: '',
            dob: '',
            kycCompleted: false,
            deviceSignature: `${navigator.userAgent}_${window.screen.width}x${window.screen.height}`,
            ipHint: 'pending' // Would ideally be captured on server
         });
      }
      onSuccess();
    } catch (err: any) {
      let errorMessage = err.message || 'Guest login failed';
      if (err.code === 'auth/operation-not-allowed') {
         errorMessage = 'Please enable Email/Password or Anonymous Authentication in the Firebase Console.';
      }
      try {
        const parsedError = JSON.parse(err.message);
        if (parsedError.error?.includes('offline')) {
          errorMessage = "Unable to connect to the database.";
        }
      } catch (e) {
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-white flex flex-col transition-colors duration-300 shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex-1 flex flex-col justify-center sm:mx-auto sm:w-full sm:max-w-md px-6 pt-12 pb-24">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="w-full"
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex justify-center">
              <Logo className="w-16 h-16" variant="blue" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
              {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome' : 'Join Us')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {isForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : (isLogin ? 'Sign in to continue your journey' : 'Create your account to start earning')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Unique Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    className="block w-full pl-11 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm bg-slate-50 dark:bg-[#1C1E24] dark:text-white focus:bg-white dark:focus:bg-[#252830]"
                    placeholder="e.g. alex99"
                    required
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {isLogin ? 'Email address or Username' : 'Email address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-input"
                  type={isLogin ? "text" : "email"}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm bg-slate-50 dark:bg-[#1C1E24] dark:text-white focus:bg-white dark:focus:bg-[#252830]"
                  placeholder={isLogin ? "you@example.com or username" : "you@example.com"}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                      }}
                      className="text-xs text-[#4A69BD] hover:text-[#3b5496] font-bold active:scale-95 transition-transform"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm bg-slate-50 dark:bg-[#1C1E24] dark:text-white focus:bg-white dark:focus:bg-[#252830]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Referral Code / Invite ID <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserPlus className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    className={`block w-full pl-11 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm ${isReferralCodeLocked ? 'bg-slate-100 dark:bg-[#1C1E24] text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-[#1C1E24] dark:text-white focus:bg-white dark:focus:bg-[#252830]'}`}
                    placeholder="Enter Referral Code (e.g. A1B2C3)"
                    readOnly={isReferralCodeLocked}
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#4A69BD', color: '#FFFFFF' }}
              className="w-full flex justify-center py-4 px-4 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(74,105,189,0.3)] hover:shadow-[0_12px_40px_rgba(74,105,189,0.4)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In Securely' : 'Create Account'))}
            </button>

            {isForgotPassword ? (
              <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400 font-medium">
                Remember your password?
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                    setError('');
                  }}
                  className="text-[#4A69BD] hover:text-[#3b5496] font-bold ml-1 active:scale-95 transition-transform"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400 font-medium">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-[#4A69BD] hover:text-[#3b5496] font-bold ml-1 active:scale-95 transition-transform"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="px-4 bg-white text-slate-400">Social Connect</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {/* Google Sign In Hidden
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-[#1C1E24] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#252830] hover:border-slate-200 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              */}

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1C1E24] text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252830] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-[0.98]"
              >
                Explore as Guest
              </button>
            </div>
          </div>



          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex flex-col items-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-4">Troubleshooting</p>
            <button
              onClick={resetAuthSystem}
              className="text-xs text-slate-400 hover:text-red-500 font-bold flex items-center transition-colors px-4 py-2 rounded-full hover:bg-red-50"
            >
              Reset App & Clear Session
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
