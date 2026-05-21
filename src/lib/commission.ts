export const APP_COMMISSION_RATE = 0.05;

export function commissionCents(priceCents: number, payoutCents: number): number {
  return Math.max(0, priceCents - payoutCents);
}
