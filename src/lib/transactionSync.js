export function findMatchingSupabaseTransaction(rows = [], tx = {}) {
  if (!Array.isArray(rows) || !tx) return null;

  const transactionId = tx.supabaseId || tx.supabase_id || tx.transactionId || null;
  const firestoreId = tx.firestore_id || tx.firestoreId || tx.id || null;
  const userId = tx.userId || tx.user_id || null;
  const paymentMethod = tx.paymentMethod || tx.payment_method || null;
  const amount = Number(tx.amount ?? 0);
  const type = tx.type || 'deposit';
  const orderId = tx.orderId || tx.order_id || null;

  const normalizedRows = [...rows]
    .filter((row) => row && typeof row === 'object')
    .sort((a, b) => {
      const aTs = new Date(a?.timestamp || a?.created_at || a?.updated_at || 0).getTime();
      const bTs = new Date(b?.timestamp || b?.created_at || b?.updated_at || 0).getTime();
      return bTs - aTs;
    });

  const match = normalizedRows.find((row) => {
    if (transactionId && row.id === transactionId) return true;
    if (firestoreId && row.firestore_id === firestoreId) return true;
    if (firestoreId && row.id === firestoreId) return true;
    if (orderId && row.order_id === orderId) return true;

    const rowUserId = row.user_id ?? row.userId ?? null;
    const rowStatus = String(row.status ?? '').toLowerCase();
    const rowType = row.type ?? 'deposit';
    const rowAmount = Number(row.amount ?? 0);
    const rowMethod = row.payment_method ?? row.paymentMethod ?? null;
    const sameUser = userId && rowUserId && String(rowUserId) === String(userId);
    const sameAmount = Number.isFinite(amount) && Number.isFinite(rowAmount) && rowAmount === amount;
    const sameType = rowType === type;
    const sameMethod = !paymentMethod || !rowMethod || rowMethod === paymentMethod;

    if (sameUser && sameAmount && sameType && sameMethod && rowStatus === 'pending') {
      return true;
    }

    if (!userId || !rowUserId || rowAmount !== amount || rowType !== type) {
      return false;
    }

    if (paymentMethod && rowMethod && rowMethod !== paymentMethod) {
      return false;
    }

    return rowStatus === 'pending';
  });

  return match || null;
}
