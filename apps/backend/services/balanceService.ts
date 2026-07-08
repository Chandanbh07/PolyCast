type Tx = any;

export const CENTS_PER_SHARE = 100;

export async function lockUser(tx: Tx, userId: string) {
  const users = await tx.$queryRaw<
    { id: string; address: string; usdBalance: number }[]
  >`
    SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;
  `;
  const user = users[0];
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function debitBalance(
  tx: Tx,
  userId: string,
  amountCents: number,
) {
  if (amountCents <= 0) return;

  const updated = await tx.user.updateMany({
    where: { id: userId, usdBalance: { gte: amountCents } },
    data: { usdBalance: { decrement: amountCents } },
  });

  if (updated.count !== 1) {
    throw new Error("Insufficient USD balance");
  }
}

export async function creditBalance(
  tx: Tx,
  userId: string,
  amountCents: number,
) {
  if (amountCents <= 0) return;

  await tx.user.update({
    where: { id: userId },
    data: { usdBalance: { increment: amountCents } },
  });
}

export function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

export function sharesToCents(shares: number) {
  return shares * CENTS_PER_SHARE;
}
