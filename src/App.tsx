import { useState, useEffect, useRef, startTransition, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { auth, db, onAuthStateChanged, doc, onSnapshot, updateDoc, setDoc, getDoc, parseUserProfile, verifyClockIntegrity } from './lib/firebase';
import { Screen } from './types';
import { registerPushNotifications } from './lib/notificationSystem';
import { vibrateLight } from './lib/haptics';
import { useNotification } from './components/NotificationProvider';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

// Lazy Load All Screens to massively reduce initial JS bundle size and CPU parsing
const Intro1 = lazy(() => import('./components/Intro1'));
const Intro2 = lazy(() => import('./components/Intro2'));
const Intro3 = lazy(() => import('./components/Intro3'));
const Auth = lazy(() => import('./components/Auth'));
const Welcome = lazy(() => import('./components/Welcome'));
const Home = lazy(() => import('./components/Home'));
const DailyTasks = lazy(() => import('./components/DailyTasks'));
const Account = lazy(() => import('./components/Account'));
const Referrals = lazy(() => import('./components/Referrals'));
const Admin = lazy(() => import('./components/Admin'));
const ComingSoon = lazy(() => import('./components/ComingSoon'));
const Deposit = lazy(() => import('./components/Deposit'));
const Withdrawal = lazy(() => import('./components/Withdrawal'));
const PlanDetail = lazy(() => import('./components/PlanDetail'));
const AppIntroduction = lazy(() => import('./components/AppIntroduction'));
const AppTutorial = lazy(() => import('./components/AppTutorial'));
const OrderRecord = lazy(() => import('./components/OrderRecord'));
const HelpChat = lazy(() => import('./components/HelpChat'));
const PersonalInfo = lazy(() => import('./components/PersonalInfo'));
const LinkedMobile = lazy(() => import('./components/LinkedMobile'));
const SecurityCenter = lazy(() => import('./components/SecurityCenter'));
const Settings = lazy(() => import('./components/Settings'));
const Transfer = lazy(() => import('./components/Transfer'));
const CommissionRates = lazy(() => import('./components/CommissionRates'));
const TeamMechanism = lazy(() => import('./components/TeamMechanism'));
const About = lazy(() => import('./components/About'));
const LanguagePage = lazy(() => import('./components/LanguagePage'));
import BottomNav from './components/BottomNav';

// Lightweight Fallback for lazy boundaries
const ScreenFallback = () => (
  <div className="flex items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-[#0B0C10]">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const { showNotification } = useNotification();
  const [screen, setScreen] = useState<Screen>(() => {
    // If a referral code is in the URL, capture it immediately and land them directly on the signup screen ('auth')
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode.toUpperCase());
      return 'auth';
    }

    const saved = sessionStorage.getItem('appState_screen') as Screen;
    if (saved === 'auth' || saved === 'intro2' || saved === 'intro3') return 'intro1';
    return saved || 'intro1';
  });
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    return sessionStorage.getItem('appState_selectedPlanId') || 'trainee';
  });
  const [lastBackPress, setLastBackPress] = useState(0);
  // Ref to track current screen inside effects without adding it as a dependency
  const screenRef = useRef<Screen>(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  const navigate = (s: Screen, replace = false) => {
    vibrateLight();
    if (!replace) {
      window.history.pushState({ screen: s }, '', '');
    }
    startTransition(() => {
      setScreen(s);
    });
  };

  // --- BACKGROUND CLOCK MONITOR ---
  useEffect(() => {
    if (!user) return;

    const checkTime = async () => {
      await verifyClockIntegrity(showNotification);
    };

    // Check every 5 minutes
    const interval = setInterval(checkTime, 5 * 60 * 1000);
    // Also check on mount
    checkTime();

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // Clear chunk load retry flag on successful mount
    sessionStorage.removeItem('chunk_load_retry');

    // --- THEME INITIALIZATION (Default Light) ---
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (!savedTheme) localStorage.setItem('theme', 'light');
    }

    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode.toUpperCase());
      // Clean up URL without reload
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({ screen }, '', newUrl);
    }

    // Synchronize initial state with history
    window.history.replaceState({ screen }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setScreen(event.state.screen as Screen);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Native Swipe-Back & Hardware Back Button Guard
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleBackAction = () => {
      const rootScreens = ['home', 'intro1', 'auth', 'welcome'];
      if (rootScreens.includes(screen)) {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          CapApp.exitApp();
        } else {
          setLastBackPress(now);
          showNotification("Press back again to exit", { type: 'info', title: 'EXIT' });
          vibrateLight();
        }
        return false; // Handled/Blocked
      } else {
        vibrateLight();
        window.history.back();
        return true;
      }
    };

    // Hardware Back Button (Android)
    const backListener = CapApp.addListener('backButton', () => {
      handleBackAction();
    });

    // Touch Gesture (Swipe from Left)
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = Math.abs(touchEndY - touchStartY);

      // Sensitive Edge-Trigger (Left 30px)
      if (touchStartX < 30 && deltaX > 70 && deltaY < 40) {
        handleBackAction();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      backListener.then(l => l.remove());
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [screen, lastBackPress]);

  // Handle Automatic Dark Mode — only when user has NOT set a manual preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return; // Respect explicit user choice from Settings

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const listener = (e: MediaQueryListEvent) => {
      // Re-check each time — user may have set preference in between
      if (localStorage.getItem('theme')) return;
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // --- NATIVE ANDROID OPTIMIZATION ---
  useEffect(() => {
    const initNative = async () => {
      try {
        // Hide splash screen smoothly
        await SplashScreen.hide({
          fadeOutDuration: 500
        });

        // Set Status Bar
        const isDark = document.documentElement.classList.contains('dark');
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light
        });

        // For Android: set background color to match app brand or background
        // Light mode: Zalando Blue or light gray, Dark mode: Dark background
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0B0C10' : '#4A69BD'
        });

        // Make it translucent for an immersive edge-to-edge look on Android/iOS
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Initialize Google Sign-in
        try {
          await GoogleSignIn.initialize({
            clientId: '595716331187-rvt1mpgc8bgsh636u53jje41ccg7n6u5.apps.googleusercontent.com',
          });
        } catch (googleInitErr) {
          console.warn('Google Sign-in initialization skipped or failed:', googleInitErr);
        }

      } catch (e) {
        console.warn('Native plugins not available:', e);
      }
    };

    if (!initializing) {
      initNative();
    }
  }, [initializing]);

  // Update Status Bar when theme changes
  useEffect(() => {
    const updateStatusBar = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        const isIntro = ['intro1', 'intro2', 'intro3'].includes(screen);

        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light
        });

        // Intro screens always get Zalando Blue status bar
        const color = isIntro ? '#4A69BD' : (isDark ? '#0B0C10' : '#F8FAFF');

        await StatusBar.setBackgroundColor({ color });
      } catch (e) { }
    };
    updateStatusBar();
  }, [screen]);


  const navigateToPlan = (planId: string) => {
    setSelectedPlanId(planId);
    navigate('plan-detail');
  };

  useEffect(() => {
    let profileUnsub: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = undefined;
      }

      if (u) {
        // Listen to global profile
        profileUnsub = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const rawData = docSnap.data();
            const data = parseUserProfile(rawData);

            if (data.isBlocked) {
              showNotification("Your account has been blocked by the admin.", { type: 'error', title: 'ACCOUNT BLOCKED' });
              auth.signOut();
              setUser(null);
            } else {
              // Daily Reset Check (Earnings & Tasks)
              const now = new Date();
              const todayStr = now.toISOString().split('T')[0];
              const lastUpdateStr = data.updatedAt ? data.updatedAt.split('T')[0] : '';

              if (lastUpdateStr && lastUpdateStr !== todayStr) {
                // It's a new day! Reset today's stats
                updateDoc(doc(db, 'users', u.uid), {
                  todayTaskEarnings: 0,
                  todayTeamEarnings: 0,
                  tasksCompletedCount: 0,
                  updatedAt: now.toISOString()
                }).catch(e => console.error("Daily reset failed:", e));
              }

              // 90-Day Plan Expiry Check
              if (data.currentPlan && data.currentPlan !== 'none' && data.planExpiry) {
                const expiryDate = new Date(data.planExpiry).getTime();
                if (now.getTime() > expiryDate) {
                  updateDoc(doc(db, 'users', u.uid), {
                    currentPlan: 'none',
                    planExpiry: null,
                    updatedAt: now.toISOString()
                  }).catch(e => console.error("Expiry update failed:", e));
                  showNotification("Your previous plan has expired after 90 days. Please purchase a new plan.", { type: 'info', title: 'PLAN EXPIRED' });
                }
              }
              setUser(u);
              registerPushNotifications();
            }
          } else {
            // Profile doesn't exist yet — auto-heal if not mid-registration
            if (sessionStorage.getItem('is_registering') !== 'true') {
              // Auto-create missing profile with safe defaults
              const defaultProfile = {
                userId: u.uid,
                email: u.email || u.providerData?.[0]?.email || '',
                balance: 0,
                currentPlan: 'none',
                isAdmin: false,
                createdAt: new Date().toISOString(),
                todayTeamEarnings: 0,
                todayTaskEarnings: 0,
                totalEarnings: 0,
                tasksCompletedCount: 0,
                completedDaysCount: 0,
                displayName: u.displayName || '',
                phone: '',
                dob: '',
                kycCompleted: false,
                referralCode: u.uid.substring(0, 6).toUpperCase(),
                deviceSignature: `${navigator.userAgent}_${window.screen.width}x${window.screen.height}`,
                ipHint: 'pending'
              };
              setDoc(doc(db, 'users', u.uid), defaultProfile)
                .then(() => console.log('Auto-healed missing user profile for', u.uid))
                .catch(e => console.error('Failed to auto-heal user profile:', e));
            }
            setUser(u);
          }
          setInitializing(false);
        });

        // Use ref to read current screen without adding it to deps
        if (['intro1', 'intro2', 'intro3', 'auth'].includes(screenRef.current)) {
          navigate('home', true);
        }
      } else {
        setUser(null);
        setInitializing(false);
        if (!['intro1', 'intro2', 'intro3', 'auth'].includes(screenRef.current)) {
          navigate('intro1', true);
        }
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []); // ✅ Empty deps — auth listener mounts once, uses screenRef for current screen

  useEffect(() => {
    sessionStorage.setItem('appState_screen', screen);
  }, [screen]);

  useEffect(() => {
    sessionStorage.setItem('appState_selectedPlanId', selectedPlanId);
  }, [selectedPlanId]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        vibrateLight();
      }
    };

    // Use capture phase to ensure it runs early
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0C10]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Initializing Zalando Pro...</p>
        </div>
      </div>
    );
  }

  const navScreens: Screen[] = ['home', 'orders', 'referrals', 'account', 'deposit', 'withdrawal'];
  const showNav = navScreens.includes(screen);

  // Wrapping AnimatePresence with Suspense provides the cleanest result.
  return (
    <div
      className="fixed inset-0 bg-[#F8FAFF] dark:bg-[#0B0C10] flex flex-col overflow-hidden"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 32px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'
      }}
    >
      <div
        className={`flex-1 w-full max-w-md mx-auto relative bg-[#F5F5FA] shadow-2xl transition-colors duration-300 flex flex-col ${['orders', 'deposit', 'withdrawal', 'tasks'].includes(screen) ? 'overflow-hidden h-full' : 'overflow-y-auto scroll-container'
          }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className={`w-full flex-1 flex flex-col ${['orders', 'deposit', 'withdrawal', 'tasks'].includes(screen) ? 'h-full overflow-hidden' : 'shrink-0 min-h-full pb-20'
          }`}>
          <Suspense fallback={<ScreenFallback />}>
            <AnimatePresence mode="wait">
              {/* ... screens ... */}
              {screen === 'intro1' && <Intro1 key="intro1" onNext={() => navigate('intro2')} />}
              {screen === 'intro2' && <Intro2 key="intro2" onNext={() => navigate('intro3')} />}
              {screen === 'intro3' && <Intro3 key="intro3" onStart={() => navigate('auth')} />}
              {screen === 'auth' && <Auth key="auth" onSuccess={() => navigate('welcome')} />}
              {screen === 'welcome' && <Welcome key="welcome" onComplete={() => navigate('home')} />}

              {screen === 'home' && (
                <Home
                  key="home"
                  onEnterTask={() => navigate('tasks')}
                  onNavigate={navigate}
                  onViewPlan={navigateToPlan}
                />
              )}

              {screen === 'tasks' && (
                <DailyTasks
                  key="tasks"
                  onBack={() => navigate('home')}
                  onUnlockPro={() => navigate('coming-soon')}
                />
              )}

              {screen === 'orders' && <OrderRecord key="orders" onNavigate={navigate} />}
              {screen === 'account' && <Account key="account" onNavigate={navigate} />}
              {screen === 'referrals' && <Referrals key="referrals" onNavigate={navigate} />}
              {screen === 'admin' && <Admin key="admin" onNavigate={navigate} />}
              {screen === 'coming-soon' && <ComingSoon key="coming-soon" onBack={() => navigate('home')} />}

              {screen === 'deposit' && (
                <Deposit key="deposit" onBack={() => navigate('account')} onKyc={() => navigate('personal-info')} onNavigate={navigate} />
              )}

              {screen === 'withdrawal' && <Withdrawal key="withdrawal" onBack={() => navigate('account')} />}

              {screen === 'plan-detail' && (
                <PlanDetail
                  key="plan-detail"
                  planId={selectedPlanId}
                  onBack={() => navigate('home')}
                  onDeposit={() => navigate('deposit')}
                />
              )}

              {screen === 'app-intro' && (
                <AppIntroduction key="app-intro" onBack={() => navigate('home')} onNavigate={navigate} />
              )}

              {screen === 'app-tutorial' && (
                <AppTutorial key="app-tutorial" onBack={() => navigate('home')} onNavigate={navigate} />
              )}

              {screen === 'help-chat' && <HelpChat key="help-chat" onBack={() => navigate('account')} />}
              {screen === 'personal-info' && <PersonalInfo key="personal-info" onBack={() => navigate('account')} />}
              {screen === 'linked-mobile' && <LinkedMobile key="linked-mobile" onBack={() => navigate('account')} />}
              {screen === 'security-center' && <SecurityCenter key="security-center" onBack={() => navigate('account')} />}
              {screen === 'settings' && <Settings key="settings" onBack={() => navigate('account')} />}
              {screen === 'transfer' && <Transfer key="transfer" onBack={() => navigate('account')} />}
              {screen === 'commission-rates' && <CommissionRates key="commission-rates" onBack={() => navigate('home')} />}
              {screen === 'team-mechanism' && <TeamMechanism key="team-mechanism" onBack={() => navigate('home')} onNavigate={navigate} />}
              {screen === 'about' && <About key="about" onBack={() => navigate('account')} />}
              {screen === 'language-selection' && <LanguagePage key="language-selection" onBack={() => navigate('home')} />}
            </AnimatePresence>
          </Suspense>
        </main>
        {/* Spacer for navigation height so content doesn't get hidden behind it */}
        {showNav && <div className="h-20 shrink-0" />}
      </div>

      {showNav && (
        <BottomNav activeScreen={screen} onNavigate={navigate} />
      )}

      {/* Home Indicator bar (safe area aware) */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-300 rounded-full opacity-30 z-[70] pointer-events-none"></div>
    </div>
  );
}
