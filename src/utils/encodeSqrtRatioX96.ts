import { BigintIsh } from '../@types';
import invariant from 'tiny-invariant';
import { ONE, THREE, TWO, ZERO } from '../constants';

export function sqrt(y: bigint): bigint {
  invariant(y >= ZERO, 'NEGATIVE');

  let z: bigint = ZERO;
  let x: bigint;
  if (y > THREE) {
    z = y;
    x = y / TWO + ONE;
    while (x < z) {
      z = x;
      x = (y / x + x) / TWO;
    }
  } else if (y !== ZERO) {
    z = ONE;
  }
  return z;
}

/**
 * Returns the sqrt ratio as a Q64.96 corresponding to a given ratio of amount1 and amount0
 * @param amount1 The numerator amount i.e., the amount of token1
 * @param amount0 The denominator amount i.e., the amount of token0
 * @returns The sqrt ratio
 */
export function encodeSqrtRatioX96(amount1: BigintIsh, amount0: BigintIsh): bigint {
  const numerator = BigInt(amount1) << 192n;
  const denominator = BigInt(amount0);
  const ratioX192 = numerator / denominator;
  return BigInt(sqrt(ratioX192));
}
