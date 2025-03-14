import { Percent } from '../fractions/percent';

export type BigintIsh = bigint | number | string;
export const MINIMUM_LIQUIDITY = 1000n;
// exports for internal consumption
export const ZERO = 0n;
export const ONE = 1n;
export const TWO = 2n;
export const THREE = 3n;
export const FIVE = 5n;
export const TEN = 10n;
export const MaxUint256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);
// used in liquidity amount math
export const Q96 = 2n ** 96n;
export const Q192 = Q96 ** 2n;
// used in fee calculation
export const MAX_FEE = 10n ** 6n;
export const ONE_HUNDRED_PERCENT = new Percent('1');
export const ZERO_PERCENT = new Percent('0');
export const Q128 = 2n ** 128n;
