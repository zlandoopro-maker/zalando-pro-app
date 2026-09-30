export type Screen = 'intro1' | 'intro2' | 'intro3' | 'welcome' | 'auth' | 'home' | 'tasks' | 'orders' | 'account' | 'referrals' | 'admin' | 'coming-soon' | 'deposit' | 'withdrawal' | 'transfer' | 'plan-detail' | 'app-intro' | 'app-tutorial' | 'help-chat' | 'personal-info' | 'linked-mobile' | 'security-center' | 'settings' | 'commission-rates' | 'about' | 'team-mechanism' | 'language-selection';

export interface UserProfile {
  userId: string;
  email: string;
  username?: string;
  usernameLower?: string;
  password?: string;
  displayName: string;
  phone?: string;
  dob?: string;
  kycCompleted?: boolean;
  referralCode: string;
  referredBy?: string;
  balance: number;
  totalEarnings: number;
  todayTaskEarnings: number;
  todayTeamEarnings: number;
  currentPlan?: string;
  planPurchaseDate?: string;
  planExpiry?: string;
  tasksCompletedCount: number;
  completedDaysCount?: number;
  lastTaskDate?: string;
  withdrawalLockUntil?: string;
  lastWithdrawalDate?: string;
  isAdmin: boolean;
  isBlocked?: boolean;
  hideBalance?: boolean;
  biometricLogin?: boolean;
  usdtAddress?: string;
  binanceId?: string;
  createdAt: string;
}

export interface PositionTier {
  id: string;
  name: string;
  price: number;
  dailyTasks: number;
  reward: number; // Daily reward
  approxPrice?: number;
  commissionRate?: string;
  stars: number;
  status: 'locked' | 'active' | 'enter' | 'apply';
  buttonText?: string;
  image?: string;
  flowSteps?: {
    step1: { title: string; desc: string; detailTitle: string; detailDesc: string; image: string };
    step2: { title: string; desc: string; detailTitle: string; detailDesc: string; image: string };
    step3: { title: string; desc: string; detailTitle: string; detailDesc: string; image: string };
  };
}

export interface TaskItem {
  id: string;
  name: string;
  image: string;
  reward: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'commission' | 'task_reward' | 'plan_purchase';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  txid?: string;
  timestamp: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  inviteeId: string;
  inviteeName: string;
  planType: string;
  commissionEarned: number;
  timestamp: string;
}

export interface TaskOrder {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productImage: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  estimatedRefund: number;
  submittedAt: string;
  status: 'Successful' | 'Pending' | 'Failed';
}

