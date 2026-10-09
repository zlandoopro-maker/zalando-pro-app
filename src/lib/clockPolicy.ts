export function shouldEnforceClockValidation(uid?: string, registrationInProgress = false): boolean {
  if (registrationInProgress) return false;
  return Boolean(uid && uid.trim().length > 0);
}
