import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// TYPES & HELPER ABSTRACTIONS FOR SUPABASE EMULATING FIRESTORE
// ---------------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(...args: any[]) {
  const [error, operationType, path] = args;
  console.error(`Database Operation Error [${operationType}] at [${path}]:`, error);
}

export const DB_BACKEND = 'SUPABASE';
export const firebaseEnabled = false;

export const resetAuthSystem = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
};

export function parseUserProfile(data: any): any {
  if (!data || typeof data !== 'object') return null;

  const camelMapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    camelMapped[key] = value;
    if (key.includes('_')) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      camelMapped[camelKey] = value;
    }
  }

  const blockReason = String(data.block_reason ?? data.ban_reason ?? data.blockReason ?? data.banReason ?? '').trim();

  return {
    ...camelMapped,
    userId: data.user_id || data.userId || data.uid || data.id,
    uid: data.user_id || data.userId || data.uid || data.id,
    isAdmin: Boolean(data.is_admin ?? data.isAdmin ?? false),
    isBlocked: Boolean(data.is_blocked === true || data.isBlocked === true || blockReason.length > 0),
    todayTeamEarnings: Number(data.today_team_earnings ?? data.todayTeamEarnings ?? 0),
    todayTaskEarnings: Number(data.today_task_earnings ?? data.todayTaskEarnings ?? 0),
    totalEarnings: Number(data.total_earnings ?? data.totalEarnings ?? 0),
    balance: Number(data.balance) || 0,
    tasksCompletedCount: Number(data.tasks_completed_count ?? data.tasksCompletedCount ?? 0),
    completedDaysCount: Number(data.completed_days_count ?? data.completedDaysCount ?? 0),
    displayName: data.display_name || data.displayName || '',
    phone: data.phone || '',
    dob: data.dob || '',
    kycCompleted: Boolean(data.kyc_completed ?? data.kycCompleted ?? false),
    referralCode: data.referral_code || data.referralCode || 'UNKNOWN',
    referredBy: data.referred_by || data.referredBy || null,
    currentPlan: data.current_plan || data.currentPlan || 'none',
    vipTier: data.vip_tier || data.vipTier || 'VIP0',
    updatedAt: data.updated_at || data.updatedAt || null,
    planExpiry: data.plan_expiry || data.planExpiry || null,
    planPurchaseDate: data.plan_purchase_date || data.planPurchaseDate || null,
    lastTaskDate: data.last_task_date || data.lastTaskDate || null,
    usdtAddress: data.usdt_address || data.usdtAddress || ''
  };
}

// Map camelCase fields to snake_case for Supabase
function mapToSupabaseRow(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    let snakeKey = key;
    if (key === 'userId') {
      snakeKey = 'user_id';
    } else if (/[A-Z]/.test(key)) {
      snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    mapped[snakeKey] = value;
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// AUTHENTICATION ADAPTER
// ---------------------------------------------------------------------------

let currentAuthUser: any = null;
const authListeners: Array<(user: any) => void> = [];

supabase.auth.getSession().then(({ data }) => {
  currentAuthUser = data.session?.user ? formatSupabaseUser(data.session.user) : null;
  authListeners.forEach(cb => cb(currentAuthUser));
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentAuthUser = session?.user ? formatSupabaseUser(session.user) : null;
  authListeners.forEach(cb => cb(currentAuthUser));
});

function formatSupabaseUser(user: any) {
  if (!user) return null;
  return {
    uid: user.id,
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
    emailVerified: Boolean(user.email_confirmed_at),
    isAnonymous: false,
    delete: async () => {}
  };
}

export const auth = {
  get currentUser() {
    return currentAuthUser;
  },
  async signOut() {
    await supabase.auth.signOut();
    currentAuthUser = null;
    authListeners.forEach(cb => cb(null));
  }
};

export const googleProvider = {};

export function onAuthStateChanged(...args: any[]) {
  const callback = typeof args[0] === 'function' ? args[0] : args[1];
  if (!callback) return () => {};

  authListeners.push(callback);
  callback(currentAuthUser);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
}

export async function signInWithEmailAndPassword(...args: any[]) {
  const email = typeof args[0] === 'string' ? args[0] : args[1];
  const pass = typeof args[0] === 'string' ? args[1] : args[2];
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  currentAuthUser = formatSupabaseUser(data.user);
  return { user: currentAuthUser };
}

export async function createUserWithEmailAndPassword(...args: any[]) {
  const email = typeof args[0] === 'string' ? args[0] : args[1];
  const pass = typeof args[0] === 'string' ? args[1] : args[2];
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) throw error;
  currentAuthUser = formatSupabaseUser(data.user);
  return { user: currentAuthUser };
}

export async function signInWithPopup(..._args: any[]) {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function signInAnonymously(..._args: any[]) {
  const dummyEmail = `user_${Date.now()}@zalando.app`;
  const dummyPass = `Zalando_${Math.random().toString(36).substring(2)}`;
  return createUserWithEmailAndPassword(dummyEmail, dummyPass);
}

export async function sendPasswordResetEmail(...args: any[]) {
  const email = typeof args[0] === 'string' ? args[0] : args[1];
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut(..._args: any[]) {
  await auth.signOut();
}

export async function deleteUser(..._args: any[]) {
  console.warn("Delete user requested");
}

// ---------------------------------------------------------------------------
// DATABASE ADAPTER OVER SUPABASE
// ---------------------------------------------------------------------------

export const db = Object.freeze({
  backend: 'supabase',
  mode: 'compatibility-only',
  isFirebase: false
});

export interface DocRef {
  type: 'doc';
  table: string;
  id: string;
  parentUserId?: string;
}

export interface CollectionRef {
  type: 'collection';
  table: string;
  parentUserId?: string;
}

export interface QueryRef {
  type: 'query';
  table: string;
  wheres: Array<{ field: string; op: string; value: any }>;
  orderBys: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limitNum?: number;
}

// Subcollection map: Firestore path 'users/{uid}/orders' → Supabase table 'orders'
const SUBCOLLECTION_MAP: Record<string, string> = {
  'orders': 'orders',
  'shippedOrders': 'shipped_orders',
  'shipped_orders': 'shipped_orders',
};

export function doc(...args: any[]): DocRef {
  if (args.length === 1 && typeof args[0] === 'string') {
    const parts = args[0].split('/');
    return { type: 'doc', table: parts[0] || 'users', id: parts[1] || '' };
  }
  const strArgs = args.filter(a => typeof a === 'string');
  
  if (strArgs.length >= 4) {
    const parentId = strArgs[1];
    const subCollection = strArgs[2];
    const docId = strArgs[3];
    const mappedTable = SUBCOLLECTION_MAP[subCollection] || subCollection;
    return { type: 'doc', table: mappedTable, id: docId || '', parentUserId: parentId };
  }
  
  return { type: 'doc', table: strArgs[0] || 'users', id: strArgs[1] || '' };
}

export function collection(...args: any[]): CollectionRef {
  const strArgs = args.filter(a => typeof a === 'string');
  
  if (strArgs.length >= 3) {
    const parentId = strArgs[1];
    const subCollection = strArgs[2];
    const mappedTable = SUBCOLLECTION_MAP[subCollection] || subCollection;
    return { type: 'collection', table: mappedTable, parentUserId: parentId };
  }
  
  return { type: 'collection', table: strArgs[0] || 'users' };
}

export function query(col: CollectionRef | QueryRef, ...clauses: any[]): QueryRef {
  const q: QueryRef = {
    type: 'query',
    table: col?.table || 'users',
    wheres: col && 'wheres' in col ? [...col.wheres] : [],
    orderBys: col && 'orderBys' in col ? [...col.orderBys] : [],
    limitNum: col && 'limitNum' in col ? col.limitNum : undefined,
  };
  
  if (col && 'parentUserId' in col && (col as any).parentUserId) {
    q.wheres.push({ field: 'user_id', op: '==', value: (col as any).parentUserId });
  }

  for (const clause of clauses) {
    if (!clause) continue;
    if (clause.type === 'where') q.wheres.push(clause);
    else if (clause.type === 'orderBy') q.orderBys.push(clause);
    else if (clause.type === 'limit') q.limitNum = clause.value;
  }
  return q;
}

export function where(field: string, op: string, value: any) {
  const mappedField = field === 'userId' ? 'user_id' : (/[A-Z]/.test(field) ? field.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) : field);
  return { type: 'where', field: mappedField, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  const mappedField = field === 'createdAt' ? 'created_at' : (/[A-Z]/.test(field) ? field.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) : field);
  return { type: 'orderBy', field: mappedField, direction };
}

export function limit(value: number) {
  return { type: 'limit', value };
}

export function increment(amount: number) {
  return { __type: 'increment', amount };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export async function getDoc(...args: any[]) {
  const ref = args[0] as DocRef;
  if (!ref || !ref.id) {
    return { exists: () => false, data: () => null, id: '' };
  }
  const { data, error } = await supabase.from(ref.table).select('*').eq('id', ref.id).maybeSingle();
  if (error || !data) {
    return { exists: () => false, data: () => null, id: ref.id };
  }
  const parsedData = parseUserProfile(data);
  return {
    exists: () => true,
    id: data.id,
    data: () => parsedData,
    ref
  };
}

function notifyLocalChange(table: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase_local_change', { detail: { table } }));
  }
}

export async function setDoc(...args: any[]) {
  const ref = args[0] as DocRef;
  const data = args[1] as Record<string, any>;
  if (!ref || !data) return;
  const mapped = mapToSupabaseRow(data);
  const docId = ref.id || mapped.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  mapped.id = docId;

  if (ref?.parentUserId && !mapped.user_id) {
    mapped.user_id = ref.parentUserId;
  }

  const tableName = ref?.table || 'users';
  if (tableName === 'users') {
    delete mapped.user_id;
  }

  // Handle increment objects
  const incKeys = Object.keys(mapped).filter(
    k => mapped[k] && typeof mapped[k] === 'object' && mapped[k].__type === 'increment'
  );

  const increments: Record<string, number> = {};
  if (incKeys.length > 0) {
    for (const k of incKeys) {
      increments[k] = mapped[k].amount || 0;
      delete mapped[k];
    }
  }

  if (Object.keys(mapped).length > 0) {
    const { error } = await supabase.from(tableName).upsert(mapped, { onConflict: 'id' });
    if (error) {
      console.error(`Error in setDoc (${tableName}):`, JSON.stringify(error));
    }
  }
  
  if (incKeys.length > 0) {
    const { error: rpcError } = await supabase.rpc('atomic_increment', {
      table_name: tableName,
      row_id: docId,
      increments: increments
    });
    if (rpcError) console.error(`Error in setDoc RPC (${tableName}):`, JSON.stringify(rpcError));
  }
  
  notifyLocalChange(tableName);
}

export async function updateDoc(...args: any[]) {
  const ref = args[0] as DocRef;
  const data = args[1] as Record<string, any>;
  if (!ref || !ref.id) return;
  const tableName = ref.table || 'users';

  const mapped = mapToSupabaseRow(data);

  // Handle increment objects
  const incKeys = Object.keys(mapped).filter(
    k => mapped[k] && typeof mapped[k] === 'object' && mapped[k].__type === 'increment'
  );

  const increments: Record<string, number> = {};
  if (incKeys.length > 0) {
    for (const k of incKeys) {
      increments[k] = mapped[k].amount || 0;
      delete mapped[k];
    }
  }

  if (Object.keys(mapped).length > 0) {
    const { error } = await supabase.from(tableName).update(mapped).eq('id', ref.id);
    if (error) {
      console.error(`Error in updateDoc (${tableName}):`, error);
    }
  }

  if (incKeys.length > 0) {
    const { error: rpcError } = await supabase.rpc('atomic_increment', {
      table_name: tableName,
      row_id: ref.id,
      increments: increments
    });
    if (rpcError) console.error(`Error in updateDoc RPC (${tableName}):`, JSON.stringify(rpcError));
  }

  notifyLocalChange(tableName);
}

export async function addDoc(...args: any[]) {
  const col = args[0] as CollectionRef;
  const data = args[1] as Record<string, any>;
  const mapped = mapToSupabaseRow(data);
  if (col?.parentUserId && !mapped.user_id) {
    mapped.user_id = col.parentUserId;
  }
  const tableName = col?.table || 'users';
  if (tableName === 'users') {
    delete mapped.user_id;
  }
  const { data: inserted, error } = await supabase.from(tableName).insert(mapped).select().single();
  if (error) {
    console.error(`Error in addDoc (${tableName}):`, error);
    throw error;
  }
  notifyLocalChange(tableName);
  return { id: inserted.id };
}

export async function deleteDoc(...args: any[]) {
  const ref = args[0] as DocRef;
  const tableName = ref?.table || 'users';
  const { error } = await supabase.from(tableName).delete().eq('id', ref?.id);
  if (error) {
    console.error(`Error in deleteDoc (${tableName}):`, error);
  } else {
    notifyLocalChange(tableName);
  }
}

export async function getDocs(...args: any[]) {
  const q = args[0] as (QueryRef | CollectionRef);
  if (!q) return { empty: true, docs: [] };

  let queryBuilder = supabase.from(q.table).select('*');
  if ('wheres' in q && q.wheres) {
    for (const w of q.wheres) {
      if (w.op === '==') queryBuilder = queryBuilder.eq(w.field, w.value);
      else if (w.op === '!=') queryBuilder = queryBuilder.neq(w.field, w.value);
      else if (w.op === '>') queryBuilder = queryBuilder.gt(w.field, w.value);
      else if (w.op === '>=') queryBuilder = queryBuilder.gte(w.field, w.value);
      else if (w.op === '<') queryBuilder = queryBuilder.lt(w.field, w.value);
      else if (w.op === '<=') queryBuilder = queryBuilder.lte(w.field, w.value);
    }
  }
  if ('orderBys' in q && q.orderBys) {
    for (const o of q.orderBys) {
      queryBuilder = queryBuilder.order(o.field, { ascending: o.direction === 'asc' });
    }
  }
  if ('limitNum' in q && q.limitNum) {
    queryBuilder = queryBuilder.limit(q.limitNum);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    console.error(`Error in getDocs (${q.table}):`, error);
    return { empty: true, docs: [] };
  }

  const docs = (data || []).map(row => {
    const parsed = parseUserProfile(row);
    return {
      id: row.id,
      data: () => parsed,
      ref: doc(null, q.table, row.id)
    };
  });

  const result = {
    empty: docs.length === 0,
    docs,
    forEach(fn: (doc: any) => void) { docs.forEach(fn); },
    size: docs.length
  };
  return result;
}

export function onSnapshot(...args: any[]) {
  const target = args[0];
  const callback = typeof args[1] === 'function' ? args[1] : args[2];

  if (!target || !callback) return () => {};

  const fetchAndNotify = async () => {
    if (target.type === 'doc') {
      const snap = await getDoc(target);
      callback(snap);
    } else {
      const snap = await getDocs(target);
      callback(snap);
    }
  };

  fetchAndNotify();

  const handleLocalChange = (e: any) => {
    if (e.detail?.table === (target.table || 'users')) {
      fetchAndNotify();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('supabase_local_change', handleLocalChange);
  }

  const channelName = `realtime_${target.table || 'users'}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: target.table || 'users' }, () => {
      fetchAndNotify();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('supabase_local_change', handleLocalChange);
    }
  };
}

export async function runTransaction(...args: any[]) {
  const updateFunction = typeof args[0] === 'function' ? args[0] : args[1];
  if (!updateFunction) return;

  const pendingWrites: Promise<any>[] = [];

  const mockTransaction = {
    async get(ref: DocRef) {
      return getDoc(ref);
    },
    update(ref: DocRef, data: Record<string, any>) {
      const p = updateDoc(ref, data);
      pendingWrites.push(p);
      return p;
    },
    set(ref: DocRef, data: Record<string, any>) {
      const p = setDoc(ref, data);
      pendingWrites.push(p);
      return p;
    }
  };

  const result = await updateFunction(mockTransaction);
  await Promise.all(pendingWrites);
  return result;
}

export { verifyClockIntegrity, startClockMonitor, stopClockMonitor, initClockBaseline, getReliableServerTime } from './clockGuard';