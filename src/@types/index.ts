export type BigintIsh = bigint | number | string;

/**
 * The default factory enabled fee amounts, denominated in hundredths of bips.
 */
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  LOWER_MEDIUM = 2500,
  MEDIUM = 3000,
  HIGH = 10000,
}

/**
 * The default factory tick spacings by fee amount.
 */
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.LOWER_MEDIUM]: 50,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export enum WalletVersion {
  V3R1 = 0,
  V3R2 = 1,
  V4R1 = 2,
  V4R2 = 3,
  V5_BETA = 4,
  V5R1 = 5,
}
