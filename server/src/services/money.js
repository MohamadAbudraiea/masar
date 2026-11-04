/**
 * Commission & split calculations (all amounts in JD with 3 decimals)
 * Rules:
 * - Masar commission: always 4%
 * - Escrow commission: below 2,000 JD -> 2%, +1% per additional full 1,000 JD, capped at 5%
 * - Driver net = price - escrow commission - Masar commission
 * - Computations use integer fils (1 JD = 1000 fils) to prevent float errors
 */
export function computeSplit(priceJd) {
  const fils = Math.round(Number(priceJd) * 1000);
  const wholeThousands = Math.floor(fils / 1_000_000);
  const escrowPct = Math.min(5, 2 + Math.max(0, wholeThousands - 1)); // 2..5
  const escrowFils = Math.round((fils * escrowPct) / 100);
  const masarFils = Math.round((fils * 4) / 100);
  const driverFils = fils - escrowFils - masarFils;
  const jd = (f) => (f / 1000).toFixed(3);
  return {
    price: jd(fils),
    escrowPct,
    escrowFee: jd(escrowFils),
    masarFee: jd(masarFils),
    driverNet: jd(driverFils),
  };
}

