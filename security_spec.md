# Security Specification: Zalando Pro Data Platform

## 1. Data Invariants
- **User Ownership**: Users have full control over their own profile except for core financial and administrative fields.
- **Relational Integrity**: Transactions must always be linked to a valid user.
- **Immutability**: Once a transaction is created, its amount and type are immutable. Only status can change (and only by authorized actors).
- **Plan Integrity**: Plans are global constants managed by the system, not users.
- **Auth Consistency**: The `userId` in any document must match the `request.auth.uid`.

## 2. The Dirty Dozen (Test Payloads)

1. **Identity Spoof**: `{ userId: "victim123", email: "hacker@evil.com" }` to `users/attacker456`
2. **Admin Injection**: `{ isAdmin: true }` to `users/myuid`
3. **Ghost Balance**: `{ balance: 999999 }` to `users/myuid`
4. **Cross-Read**: `get("/users/somebody_else")`
5. **Direct Withdrawal**: `update("/users/myuid", { balance: 0 })` bypassing transaction logic.
6. **Time Warp**: `{ createdAt: "2020-01-01" }`
7. **Plan Hack**: `update("/plans/basic", { dailyReward: 1000 })`
8. **Status Fraud**: `update("/transactions/tx123", { status: "completed" })`
9. **Orphan Tx**: `create("/transactions/badtx", { userId: "none", amount: 100 })`
10. **ID Poison**: `create("/users/LONG_ID_1MB...", { ... })`
11. **Shadow Update**: `update("/users/myuid", { verified: true })` (field not in schema)
12. **Mass Scrape**: `list("/users")` without owner filter.

## 3. Test Runner Strategy
We will use `firestore.rules.test.ts` to verify these denials. (Omitted for brevity in this step, but implied by the workflow).
