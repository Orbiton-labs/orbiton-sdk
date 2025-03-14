import { Address } from '@ton/core';
import { MaxUint256, NEGATIVE_ONE, ZERO } from '../constants';
import { Jetton, JettonAmount } from '../entities';
import { maxLiquidityForAmounts } from './maxLiquidityForAmounts';
import { TickMath } from './tickMath';

export namespace LiquidityMath {
  export interface GetLiquidityOptions extends Omit<GetAmountOptions, 'amount' | 'currency'> {
    amountA: JettonAmount<Jetton>;
    amountB: JettonAmount<Jetton>;
  }

  export interface GetAmountOptions {
    // Amount of token user input
    amount: JettonAmount<Jetton>;
    // Currency of the dependent token in the pool
    currency: Jetton;
    tickLower: number;
    tickUpper: number;
    // The reason of using price sqrt X96 instead of tick current is that
    // tick current may have rounding error since it's a floor rounding
    sqrtRatioX96: bigint;
  }

  export function addDelta(x: bigint, y: bigint): bigint {
    if (y < ZERO) {
      return x - y * NEGATIVE_ONE;
    }
    return x + y;
  }

  export function getLiquidityBySingleAmount({
    amount,
    currency,
    ...rest
  }: GetAmountOptions): bigint | undefined {
    return getLiquidityByAmountsAndPrice({
      amountA: amount,
      amountB: JettonAmount.fromRawAmount(currency, MaxUint256),
      ...rest,
    });
  }

  export function getLiquidityByAmountsAndPrice({
    amountA,
    amountB,
    tickUpper,
    tickLower,
    sqrtRatioX96,
  }: GetLiquidityOptions) {
    const isToken0 = amountA.jetton.sortsBefore(amountB.jetton);
    const [inputAmount0, inputAmount1] = isToken0
      ? [amountA.quotient, amountB.quotient]
      : [amountB.quotient, amountA.quotient];
    const sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
    const sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
    try {
      return maxLiquidityForAmounts(
        sqrtRatioX96,
        sqrtRatioAX96,
        sqrtRatioBX96,
        inputAmount0,
        inputAmount1,
        true,
      );
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
