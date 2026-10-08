import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Bot, User, Search, Key, DollarSign, Clock, ShieldCheck, HelpCircle, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { Screen, Transaction } from '../types';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from '../lib/firebase';
import { db, auth } from '../lib/firebase';
import { vibrateLight } from '../lib/haptics';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface HelpChatProps {
  onBack: () => void;
  key?: string;
}

interface KnowledgeItem {
  id: string;
  category: string;
  keywords: string[];
  answer: string;
}

const EXTENDED_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'deposit_guide',
    category: 'deposit',
    keywords: [
      'withdraw', 'deposit', 'recharge', 'add money', 'fund', 'topup', 'dalna', 'bheja', 'paise dale', 'how to deposit',
      'usdt', 'trc20', 'binance pay', 'qr code', 'order id', 'payment address', 'minimum deposit', 'kitna deposit'
    ],
    answer: "📥 How to Deposit Funds:\n\n1. Go to the 'Account' or 'Home' tab and tap 'Deposit'.\n2. Choose USDT (TRC-20) or Binance Pay.\n3. Copy the official wallet address or scan the QR code in your crypto wallet (Binance, Trust Wallet, OKX, Bybit).\n4. Send your USDT and copy the Transaction Hash (TXID / Order ID).\n5. Paste your TXID into the Deposit form and submit.\n\n⏱ Verification Time: 5 to 30 minutes after admin verification.\n💡 Pro Tip: Paste your TXID directly in this chat anytime for instant live status lookup!"
  },
  {
    id: 'withdrawal_guide',
    category: 'withdrawal',
    keywords: [
      'withdraw', 'withdrawal', 'cashout', 'payout', 'take out', 'nikalna', 'paise nikale', 'how to withdraw',
      'minimum withdrawal', 'withdrawal limit', 'withdrawal fee', 'withdrawal time', 'wallet address', 'bank'
    ],
    answer: "📤 How to Withdraw Earnings:\n\n1. Go to Account → Withdrawal.\n2. Enter your cashout amount (Minimum: $10).\n3. Enter your USDT TRC-20 receiving wallet address.\n4. Tap 'Confirm Withdrawal'.\n\n⏱ Processing Schedule: 24–48 working hours (Mon–Fri, 10:00 AM – 10:00 PM IST).\n⚠️ Important Rule: You must complete daily tasks for 3 consecutive days to unlock full withdrawal eligibility.\n\n💡 Tip: Paste your withdrawal TXID here for instant live tracking!"
  },
  {
    id: 'pending_status',
    category: 'pending',
    keywords: [
      'pending', 'delay', 'delayed', 'not received', 'not credited', 'where is', 'waiting', 'still pending',
      'processing', 'time limit', 'paise nahi aaye', 'kab milega', 'kitna time'
    ],
    answer: "⏳ Why is your transaction Pending?\n\n1. 🔒 Security Audit: All deposits & withdrawals are manually verified to protect user balances.\n2. 🌐 Blockchain Confirmations: Network congestion on TRON (TRC-20) may add extra time.\n3. 🕐 Processing Hours: Withdrawals are processed Mon–Fri between 10:00 AM – 10:00 PM IST.\n4. 📋 Task Requirement: Withdrawals require completing tasks for 3 consecutive days.\n\n💡 Instant Status Check: Paste your full TXID (from Transaction History) right here and I will look up its exact live status for you!"
  },
  {
    id: 'password_recovery',
    category: 'account',
    keywords: [
      'password', 'forgot password', 'recover password', 'login issue', 'credentials', 'username', 'email',
      'password bhool gaya', 'reset password', 'account access', 'change password', 'passkey'
    ],
    answer: "🔑 Password Recovery Assistant:\n\nIf you forgot your login password:\n👉 Use the 'Forgot Password?' link on the Login screen to receive an email reset link.\n\n💡 Security Note: You can also update your password anytime in Account → Security Center."
  },
  {
    id: 'daily_tasks',
    category: 'tasks',
    keywords: [
      'task', 'tasks', 'extraction', 'extractions', 'complete task', 'how to work', 'daily task', 'task limit',
      'task reset', 'consecutive days', '3 days', 'kaam kaise kare', 'extraction failed', 'task count'
    ],
    answer: "📋 How Daily Tasks & Extractions Work:\n\n1. Tap the central 'Task' button on the bottom menu.\n2. Tap 'Start Extraction' to match high-demand European fashion wholesale items.\n3. Submit each extraction — your resale profit margin is credited to your balance in real time!\n4. Complete all daily tasks allocated for your tier (e.g. 30 tasks/day).\n\n📅 Reset Schedule: Tasks reset daily at 12:00 AM midnight IST.\n⚠️ Compliance: Complete tasks for 3 consecutive days for full withdrawal approval."
  },
  {
    id: 'tier_plans',
    category: 'plans',
    keywords: [
      'plan', 'plans', 'tier', 'tiers', 'trainee', 'general manager', 'senior manager', 'regional', 'upgrade',
      'price', 'buy plan', 'activate plan', 'profit rate', 'commission rate', 'model'
    ],
    answer: "🎯 Position Tier Plans Overview:\n\n• Trainee Manager — $50 deposit, 30 daily tasks, entry level returns.\n• General Manager — Mid tier, 30 daily tasks, higher profit rate multiplier.\n• Senior Manager — VIP tier with premium task rewards.\n• Regional General Manager — Top VIP tier with maximum earnings.\n\n💡 Hold & Preview: Press and hold any tier card on the Home screen to view the 3D profit model!\nTo Activate: Go to Home → tap a tier card → tap 'Activate Plan'."
  },
  {
    id: 'referral_team',
    category: 'referral',
    keywords: [
      'referral', 'refer', 'invite', 'friend', 'team', 'commission', 'mlm', 'level 1', 'level 2', 'level 3',
      'team mechanism', 'invitation link', 'invitation code', 'invite code', 'share link'
    ],
    answer: "👥 3-Level Team Referral System:\n\nBuild your team and earn automated passive daily income whenever your members complete tasks:\n\n• Level 1 (Direct Referrals): Earn 10% referral bonus when they activate a plan + 5% of each their task earnings.\n• Level 2 (Secondary Referrals): Earn 5% of their daily task earnings.\n• Level 3 (Sub-team Referrals): Earn 2% of their daily task earnings.\n\n🔗 How to Invite: Go to Home → Team Mechanism → tap 'Share Invitation Link' or copy your Referral Code!"
  },
  {
    id: 'app_download',
    category: 'app',
    keywords: [
      'download', 'app download', 'apk', 'android app', 'mobile app', 'install', 'update app', 'download link'
    ],
    answer: "📲 Download Official Zalando Pro App:\n\nYou can download the official Android APK directly:\n1. Go to the 'Account' tab.\n2. Tap 'Download App'.\n\nOr download directly from: /api/download-apk\nEnjoy fast performance, push notifications, and instant task extractions!"
  },
  {
    id: 'safety_legit',
    category: 'security',
    keywords: [
      'real or fake', 'safe', 'legit', 'secure', 'trusted', 'is it real', 'scam', 'safety', 'privacy',
      'company', 'zalando', 'sach hai', 'trust'
    ],
    answer: "🛡️ Safety & Security Guarantee:\n\nZalando Pro operates on audited e-commerce inventory procurement and global reselling protocols.\n\n• 🔐 256-bit SSL Encryption for all user transactions.\n• 🏦 Manual Financial Security Audits for every deposit & withdrawal.\n• 📦 Authentic European wholesale fashion supply chain partnerships.\n• 24/7 Support Assistant available to resolve any account queries."
  },
  {
    id: 'customer_support',
    category: 'support',
    keywords: [
      'admin', 'human', 'agent', 'customer care', 'contact support', 'whatsapp', 'telegram', 'email support',
      'talk to person', 'help desk', 'contact'
    ],
    answer: "💬 Customer Support Services:\n\n• 🤖 24/7 Virtual Advisor: Available right here in this chat to answer questions, check TXIDs, and retrieve passwords.\n• 🌐 Social Hub & Official Community: Go to Account → Join Social Hub to connect with our Telegram channel!\n• 📧 Email Support: Contact system administrators directly for specialized assistance."
  }
];

const QUICK_TOPICS = [
  { label: '💰 Deposits & Withdrawals', query: 'How do deposits and withdrawals work?' },
  { label: '🔑 Password Recovery', query: 'How to recover my login password?' },
  { label: '🔍 TXID Status Lookup', query: 'How to check my TXID status?' },
  { label: '📋 Daily Task Guide', query: 'How to complete daily tasks?' },
  { label: '🎯 Tier Plans & Upgrades', query: 'Tell me about position tier plans' },
  { label: '👥 Team Commission', query: 'How referral commission works?' },
  { label: '📲 Download App APK', query: 'How to download the app APK?' }
];

const HINGLISH_NORMALIZATION_MAP: Record<string, string[]> = {
  'withdraw': ['nikalna', 'nikale', 'nikal', 'cashout', 'payout', 'takeout'],
  'deposit': ['dalna', 'bheja', 'jama', 'add', 'recharge', 'topup'],
  'task': ['kaam', 'kaamkare', 'work', 'extraction'],
  'pending': ['aaye', 'aaya', 'der', 'delay', 'wait', 'kaha'],
  'password': ['pass', 'passkey', 'code', 'forget', 'bhool'],
  'referral': ['jodna', 'invite', 'share', 'dost', 'team'],
  'plan': ['upgrade', 'level', 'buy', 'purchase', 'tier']
};

const TXID_REGEX = /\b([a-fA-F0-9]{40,80}|[a-zA-Z0-9]{15,66})\b/;
const TRACKING_ID_REGEX = /\b(ZAL-\d{6,12}|shipped_[a-zA-Z0-9_-]+|[a-zA-Z0-9]{8,28})\b/;

async function lookupShippedOrder(trackingId: string, userId: string): Promise<string | null> {
  try {
    // Try exact ID first
    const snap = await getDoc(doc(db, 'users', userId, 'shippedOrders', trackingId));
    if (snap.exists()) {
      const data = snap.data();
      const claimed = data.claimed ? '✅ Claimed' : '⏳ Pending Claim';
      const created = data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Unknown';
      return `📦 Shipped Order Status:\n\n🆔 Order ID: ${trackingId}\n📊 Status: ${claimed}\n💰 Claim Amount: $${(data.claimAmount || 0).toFixed(2)}\n🗂️ Total Items: ${data.totalTasks || 'N/A'}\n📅 Created: ${created}\n\n${data.claimed ? '✅ This order has already been claimed successfully!' : '⏳ This order is awaiting claim. Go to Order Record → Z Status to claim your profit.'}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function lookupTransaction(txId: string, userId: string): Promise<string> {
  try {
    // First try shipped order lookup
    const shippedResult = await lookupShippedOrder(txId, userId);
    if (shippedResult) return shippedResult;

    // Try shipped order with prefix
    const withPrefix = `shipped_${txId}`;
    const shippedResult2 = await lookupShippedOrder(withPrefix, userId);
    if (shippedResult2) return shippedResult2;
    const txDocRef = doc(db, 'transactions', txId);
    const txSnap = await getDoc(txDocRef);

    if (txSnap.exists()) {
      const tx = txSnap.data() as Transaction;

      if (tx.userId !== userId) {
        return "⚠️ This TXID does not belong to your logged-in account. Please double-check the TXID copied from your Transaction History page.";
      }

      const ts = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown time';
      const amount = `$${(tx.amount || 0).toFixed(2)}`;
      const typeLabel = tx.type === 'deposit' ? '📥 Deposit'
        : tx.type === 'withdrawal' ? '📤 Withdrawal'
          : tx.type === 'plan_purchase' ? '🎯 Plan Purchase'
            : tx.type.replace(/_/g, ' ');

      const statusIcon = tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';
      const statusLabel = tx.status?.toUpperCase() || 'UNKNOWN';

      let response = `🔍 Live Transaction Status:\n\n`;
      response += `🆔 TXID: ${txId}\n`;
      response += `🏷️ Type: ${typeLabel}\n`;
      response += `💰 Amount: ${amount}\n`;
      response += `📊 Status: ${statusIcon} ${statusLabel}\n`;
      response += `📅 Date & Time: ${ts}\n`;

      if (tx.status === 'pending') {
        if (tx.type === 'deposit') {
          response += `\n⏳ Status Info: Your deposit is undergoing manual security verification. This typically takes 5–30 minutes.`;
        } else if (tx.type === 'withdrawal') {
          response += `\n⏳ Status Info: Your withdrawal is queued in our processing system. Working hours are Mon–Fri, 10:00 AM – 10:00 PM IST (24–48h limit).`;
        }
      } else if (tx.status === 'completed') {
        response += `\n✅ Status Info: This transaction was successfully verified and completed!`;
      } else if (tx.status === 'failed' || tx.status === 'rejected') {
        response += `\n❌ Status Info: This transaction was rejected. If a withdrawal was rejected, funds are automatically refunded back to your balance.`;
      }

      return response;
    }

    return `❓ Transaction Not Found for TXID: ${txId}\n\nPlease verify that you copied the full TXID from your Account → Transaction History page.`;
  } catch (e) {
    return "⚠️ Error looking up transaction. Please try again or check your internet connection.";
  }
}

export default function HelpChat({ onBack }: HelpChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Welcome to Zalando Pro Support! 👋 I am your 24/7 Smart Virtual Advisor.',
      timestamp: new Date()
    },
    {
      id: 'welcome-2',
      sender: 'bot',
      text: 'How can I assist you today?\n\n• 🔑 Password Recovery: Type your Username to instantly view your saved password!\n• 🔍 TXID Live Lookup: Paste any transaction ID for instant real-time status tracking.\n• 💰 Deposit, Withdrawal & Daily Task Assistance.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findBestKnowledgeMatch = (userText: string): KnowledgeItem | null => {
    const rawLower = userText.toLowerCase().trim();

    // 1. Check direct keyword match
    let bestMatch: KnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of EXTENDED_KNOWLEDGE_BASE) {
      let score = 0;

      for (const kw of item.keywords) {
        if (rawLower.includes(kw)) {
          score += kw.length > 5 ? 3 : 2;
        }
      }

      // Check Hinglish equivalences
      for (const [standardKey, hinglishList] of Object.entries(HINGLISH_NORMALIZATION_MAP)) {
        if (item.keywords.includes(standardKey)) {
          for (const hWord of hinglishList) {
            if (rawLower.includes(hWord)) {
              score += 2;
            }
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    return highestScore >= 2 ? bestMatch : null;
  };

  const processUserMessage = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date()
    };

    vibrateLight();
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: loadingId,
      sender: 'bot',
      text: '...',
      timestamp: new Date()
    }]);

    try {
      const lowerQuery = userMessage.text.toLowerCase();

      // --- FEATURE 1: USERNAME ENQUIRY SAFE RESPONSE ---
      const words = userMessage.text.trim().split(/\s+/).map(w => w.toLowerCase().replace(/^@/, ''));
      const ignoredKeywords = [
        'hello', 'hi', 'hey', 'help', 'admin', 'where', 'whats', 'which', 'deposit', 'withdraw',
        'tasks', 'status', 'pending', 'task', 'plan', 'referral', 'user', 'my', 'is', 'the', 'how'
      ];

      for (const rawWord of words) {
        if (rawWord.length >= 3 && !ignoredKeywords.includes(rawWord)) {
          const uQuery = query(collection(db, 'users'), where('usernameLower', '==', rawWord));
          const uSnap = await getDocs(uQuery);
          if (!uSnap.empty) {
            const userData = uSnap.docs[0].data();
            const targetUsername = userData.username || rawWord;

            await new Promise(resolve => setTimeout(resolve, 600));
            const botResponse = `👤 Account Registered: @${targetUsername}\n\n🔒 For your security, passwords are encrypted and cannot be displayed in chat.\n\n👉 If you forgot your password, please use 'Forgot Password?' on the Login screen or go to Account → Security Center.`;
            setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: botResponse } : msg));
            return;
          }
        }
      }

      // --- FEATURE 2: TXID / TRACKING ID LIVE LOOKUP ---
      // Detect any ID-like string (TXID, shipped order ID, tracking number)
      const txidMatch = userMessage.text.match(TXID_REGEX);
      const trackingMatch = userMessage.text.match(/ZAL-\d+/i) || userMessage.text.match(/shipped_[a-zA-Z0-9_-]+/);

      const idToLookup = trackingMatch?.[0] || txidMatch?.[1];

      if (idToLookup && idToLookup.length >= 8 && auth.currentUser) {
        await new Promise(resolve => setTimeout(resolve, 700));
        const botResponse = await lookupTransaction(idToLookup, auth.currentUser.uid);
        setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: botResponse } : msg));
        return;
      }

      // --- FEATURE 3: KNOWLEDGE BASE INTENT SEARCH ---
      const matchedKnowledge = findBestKnowledgeMatch(userMessage.text);
      let botResponse = matchedKnowledge?.answer || '';

      // --- FEATURE 4: LIVE RECENT TRANSACTIONS ATTACHMENT ---
      if (['deposit', 'withdraw', 'balance', 'transaction', 'pending', 'status', 'history', 'txid'].some(kw => lowerQuery.includes(kw))) {
        if (auth.currentUser) {
          try {
            const q = query(
              collection(db, 'transactions'),
              where('userId', '==', auth.currentUser.uid),
              where('type', 'in', ['deposit', 'withdrawal']),
              orderBy('timestamp', 'desc'),
              limit(5)
            );
            const snap = await getDocs(q);
            const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
            if (txs.length > 0) {
              if (botResponse) botResponse += "\n\n";
              botResponse += "📋 Your Recent Transactions:";
              txs.forEach(tx => {
                const icon = tx.type === 'deposit' ? '📥' : '📤';
                const statusIcon = tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';
                const time = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '';
                botResponse += `\n${icon} ${tx.type.toUpperCase()}: $${(tx.amount || 0).toFixed(2)} ${statusIcon} ${tx.status?.toUpperCase()} — ${time}`;
                if (tx.txid) botResponse += `\n   🆔 TXID: ${tx.txid}`;
              });
              botResponse += "\n\n💡 Paste any TXID or Order ID for instant detailed tracking!";
            }
          } catch (err) {
            // Ignore index error fallback
          }
        }
      }

      // --- FEATURE 5: GREETING HANDLING ---
      if (!botResponse && ['hello', 'hi', 'hey', 'helo', 'hii', 'salam', 'namaste', 'assalam', 'good morning', 'good evening'].some(g => lowerQuery.includes(g))) {
        botResponse = "👋 Hello! Welcome to Zalando Pro Support!\n\nI am your 24/7 Smart Virtual Advisor. I can help you with:\n\n• 🔑 Password Recovery — just type your username\n• 🔍 TXID / Order ID Status — paste any ID\n• 💰 Deposit & Withdrawal Help\n• 📋 Daily Task Guide\n• 🎯 Tier Plan Info\n• 👥 Referral & Team Commission\n\nHow can I help you today?";
      }

      // --- FEATURE 6: BALANCE INQUIRY ---
      if (!botResponse && ['balance', 'kitna', 'how much', 'mere paas', 'wallet'].some(kw => lowerQuery.includes(kw))) {
        botResponse = "💰 To check your current balance:\n\nGo to Home tab → your total balance is shown at the top of the screen.\n\nYou can also see detailed breakdown in:\n• Account → Transaction History\n• Home → Total Balance widget\n\nWant me to look up a specific transaction? Paste your TXID or Order ID!";
      }

      // Default Intelligent Fallback
      if (!botResponse) {
        botResponse = "I am here to help you with anything on Zalando Pro!\n\nHere is what you can ask me:\n• 🔑 Enter your Username to view your saved password\n• 🔍 Paste any TXID for live status lookup\n• 📥 How to Deposit (USDT TRC-20 / Binance Pay)\n• 📤 How to Withdraw & Processing Times\n• 📋 Daily Task Extractions & 3 Consecutive Days Rule\n• 🎯 Position Tier Plans & Upgrades\n• 👥 3-Level Team Referral System";
      }

      await new Promise(resolve => setTimeout(resolve, 600));
      setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: botResponse } : msg));

    } catch (e) {
      console.error(e);
      setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: "I'm currently experiencing technical difficulties. Please try again later." } : msg));
    } finally {
      setIsTyping(false);
      vibrateLight();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] z-[100] flex flex-col font-sans"
    >
      {/* Apple Glow Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 pointer-events-none overflow-hidden opacity-50 dark:opacity-30">
        <div className="absolute top-[-40%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0071e3]/20 via-purple-500/10 to-transparent blur-3xl" />
      </div>

      {/* Apple Frosted Navbar */}
      <div 
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="safe-top sticky top-0 z-50 bg-[#f5f5f7]/80 dark:bg-[#000000]/80 border-b border-[#d2d2d7]/50 dark:border-[#38383a]/60 px-4 py-3 flex items-center justify-between shadow-xs transition-colors"
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-[#1c1c1e] p-1.5 flex items-center justify-center border border-[#ff6b00]/30 shadow-xs shrink-0">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Zalando Pro" />
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">Zalando Pro Support</h1>
              <ShieldCheck className="w-4 h-4 text-[#0071e3] dark:text-[#2997ff]" />
            </div>

          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] p-2 flex items-center justify-center border border-[#0071e3]/20 shadow-xs">
          <img src="/logo.png" className="w-full h-full object-contain" alt="Zalando Pro Logo" />
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 relative z-10">
        {/* Support Topics Quick Banner */}
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border border-[#d2d2d7]/50 dark:border-[#38383a]/70 rounded-[24px] p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] mb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 dark:bg-[#2997ff]/20 flex items-center justify-center shrink-0 p-2 border border-[#0071e3]/20">
              <img src="/logo.png" className="w-full h-full object-contain" alt="Zalando Logo" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">Support Topics & Quick Actions</h2>
              <p className="text-[11px] text-[#86868b]">Tap any quick topic to get instant resolution</p>
            </div>
          </div>

          {/* Quick Topic Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => processUserMessage(topic.query)}
                className="px-3.5 py-1.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#0071e3]/10 dark:hover:bg-[#2997ff]/20 text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-[#0071e3] dark:hover:text-[#2997ff] border border-[#d2d2d7]/60 dark:border-[#38383a]/80 hover:border-[#0071e3]/30 rounded-full text-xs font-medium tracking-tight transition-all active:scale-95"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Log */}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2.5 max-w-[88%] sm:max-w-[82%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 mt-auto mb-1">
                  {msg.sender === 'bot' ? (
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1c1c1e] p-1.5 flex items-center justify-center border border-[#0071e3]/20 shadow-xs shrink-0">
                      <img src="/logo.png" className="w-full h-full object-contain" alt="Zalando Pro Advisor" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center border border-[#d2d2d7]/50 dark:border-[#38383a]/60">
                      <User className="w-4 h-4 text-[#86868b]" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-[24px] ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white rounded-br-[4px] shadow-[0_6px_20px_rgba(0,113,227,0.3)]'
                    : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-bl-[4px] border border-[#d2d2d7]/50 dark:border-[#38383a]/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
                  }`}>
                  {msg.sender === 'bot' && msg.text === '...' ? (
                    <div className="flex gap-1.5 items-center h-4 px-1">
                      <motion.div className="w-2 h-2 bg-[#0071e3] dark:bg-[#2997ff] rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                      <motion.div className="w-2 h-2 bg-[#0071e3] dark:bg-[#2997ff] rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      <motion.div className="w-2 h-2 bg-[#0071e3] dark:bg-[#2997ff] rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                  ) : (
                    <p className="text-[13px] sm:text-sm whitespace-pre-line leading-relaxed font-normal">{msg.text}</p>
                  )}
                  {msg.text !== '...' && (
                    <p className={`text-[9px] mt-2 font-mono font-medium text-right ${msg.sender === 'user' ? 'text-white/80' : 'text-[#86868b]'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Apple Dock Input Area */}
      <div
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
        className="p-3.5 sm:p-4 bg-white/85 dark:bg-[#1c1c1e]/85 border-t border-[#d2d2d7]/50 dark:border-[#38383a]/60 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] relative z-20"
      >
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && processUserMessage(inputText)}
            disabled={isTyping}
            placeholder="Ask anything (Deposit, TXID, Password, Tasks, Plans...)"
            className="flex-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-[#d2d2d7]/60 dark:border-[#38383a]/80 rounded-full px-5 py-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] dark:focus:ring-[#2997ff] text-[#1d1d1f] dark:text-white transition-all font-normal placeholder:text-[#86868b] disabled:opacity-50"
          />
          <button
            onClick={() => processUserMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
            className="w-11 h-11 bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-[0_4px_16px_rgba(0,113,227,0.35)] active:scale-95"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
