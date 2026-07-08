import type { PositionSide } from "./orderbookService";

type Tx = any;

export async function getPositionQty(
  tx: Tx,
  userId: string,
  marketId: string,
  type: PositionSide,
) {
  const position = await tx.position.findUnique({
    where: { userId_marketId_type: { userId, marketId, type } },
    select: { qty: true },
  });

  return position?.qty ?? 0;
}

export async function ensurePosition(
  tx: Tx,
  userId: string,
  marketId: string,
  type: PositionSide,
) {
  return tx.position.upsert({
    where: { userId_marketId_type: { userId, marketId, type } },
    create: { userId, marketId, type, qty: 0 },
    update: {},
  });
}

export async function incrementPosition(
  tx: Tx,
  userId: string,
  marketId: string,
  type: PositionSide,
  qty: number,
) {
  if (qty <= 0) return;

  await tx.position.upsert({
    where: { userId_marketId_type: { userId, marketId, type } },
    create: { userId, marketId, type, qty },
    update: { qty: { increment: qty } },
  });
}

export async function decrementPosition(
  tx: Tx,
  userId: string,
  marketId: string,
  type: PositionSide,
  qty: number,
) {
  if (qty <= 0) return;

  await ensurePosition(tx, userId, marketId, type);
  const updated = await tx.position.updateMany({
    where: { userId, marketId, type, qty: { gte: qty } },
    data: { qty: { decrement: qty } },
  });

  if (updated.count !== 1) {
    throw new Error(`Insufficient ${type} position`);
  }
}
