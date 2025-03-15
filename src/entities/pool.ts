/* eslint-disable operator-assignment */
import { JettonAmount, Price, Jetton } from '../entities';
import invariant from 'tiny-invariant';
import { FeeAmount, TICK_SPACINGS, BigintIsh } from '../@types';
import { NEGATIVE_ONE, ONE, Q192, ZERO } from '../constants';
import { LiquidityMath } from '../utils/liquidityMath';
import { SwapMath } from '../utils/swapMath';
import { TickMath } from '../utils/tickMath';
import { Tick, TickConstructorArgs } from './tick';
import { NoTickDataProvider, TickDataProvider } from './tickDataProvider';
import { TickListDataProvider } from './tickListDataProvider';

interface StepComputations {
  sqrtPriceStartX96: bigint;
  tickNext: number;
  initialized: boolean;
  sqrtPriceNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

/**
 * By default, pools will not allow operations that require ticks.
 */
const NO_TICK_DATA_PROVIDER_DEFAULT = new NoTickDataProvider();

/**
 * Represents a V3 pool
 */
export class Pool {
  public readonly jetton0: Jetton;

  public readonly jetton1: Jetton;

  public readonly fee: FeeAmount;

  public readonly sqrtRatioX96: bigint;

  public readonly liquidity: bigint;

  public readonly tickCurrent: number;

  public readonly tickDataProvider: TickDataProvider;

  public feeProtocol?: number;

  private _jetton0Price?: Price<Jetton, Jetton>;

  private _jetton1Price?: Price<Jetton, Jetton>;

  /**
   * Construct a pool
   * @param tokenA One of the tokens in the pool
   * @param tokenB The other token in the pool
   * @param fee The fee in hundredths of a bips of the input amount of every swap that is collected by the pool
   * @param sqrtRatioX96 The sqrt of the current ratio of amounts of jetton1 to jetton0
   * @param liquidity The current value of in range liquidity
   * @param tickCurrent The current tick of the pool
   * @param ticks The current state of the pool ticks or a data provider that can return tick data
   */
  public constructor(
    tokenA: Jetton,
    tokenB: Jetton,
    fee: FeeAmount,
    sqrtRatioX96: BigintIsh,
    liquidity: BigintIsh,
    tickCurrent: number,
    tickSpacing: number,
    ticks: TickDataProvider | (Tick | TickConstructorArgs)[] = NO_TICK_DATA_PROVIDER_DEFAULT,
  ) {
    invariant(Number.isInteger(fee) && fee < 1_000_000, 'FEE');

    // Remove check for now for performance
    // const tickCurrentSqrtRatioX96 = TickMath.getSqrtRatioAtTick(tickCurrent)
    // const nextTickSqrtRatioX96 = TickMath.getSqrtRatioAtTick(tickCurrent + 1)
    // invariant(
    //   bigint.greaterThanOrEqual(bigint.BigInt(sqrtRatioX96), tickCurrentSqrtRatioX96) &&
    //     bigint.lessThanOrEqual(bigint.BigInt(sqrtRatioX96), nextTickSqrtRatioX96),
    //   'PRICE_BOUNDS'
    // )

    // always create a copy of the list since we want the pool's tick list to be immutable
    [this.jetton0, this.jetton1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
    this.fee = fee;
    this.sqrtRatioX96 = BigInt(sqrtRatioX96);
    this.liquidity = BigInt(liquidity);
    this.tickCurrent = tickCurrent;
    this.tickDataProvider = Array.isArray(ticks)
      ? new TickListDataProvider(ticks, tickSpacing)
      : ticks;
  }

  /**
   * Returns true if the token is either jetton0 or jetton1
   * @param token The token to check
   * @returns True if token is either jetton0 or token
   */
  public involvesToken(token: Jetton): boolean {
    return token.equals(this.jetton0) || token.equals(this.jetton1);
  }

  /**
   * Returns the current mid price of the pool in terms of jetton0, i.e. the ratio of jetton1 over jetton0
   */
  public get jetton0Price(): Price<Jetton, Jetton> {
    return (
      this._jetton0Price ??
      (this._jetton0Price = new Price(
        this.jetton0,
        this.jetton1,
        Q192,
        this.sqrtRatioX96 * this.sqrtRatioX96,
      ))
    );
  }

  /**
   * Returns the current mid price of the pool in terms of jetton1, i.e. the ratio of jetton0 over jetton1
   */
  public get jetton1Price(): Price<Jetton, Jetton> {
    return (
      this._jetton1Price ??
      (this._jetton1Price = new Price(
        this.jetton1,
        this.jetton0,
        this.sqrtRatioX96 * this.sqrtRatioX96,
        Q192,
      ))
    );
  }

  /**
   * Return the price of the given token in terms of the other token in the pool.
   * @param token The token to return price of
   * @returns The price of the given token, in terms of the other.
   */
  public priceOf(token: Jetton): Price<Jetton, Jetton> {
    invariant(this.involvesToken(token), 'TOKEN');
    return token.equals(this.jetton0) ? this.jetton0Price : this.jetton1Price;
  }

  /**
   * Given an input amount of a token, return the computed output amount, and a pool with state updated after the trade
   * @param inputAmount The input amount for which to quote the output amount
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit
   * @returns The output amount and the pool with updated state
   */
  public async getOutputAmount(
    inputAmount: JettonAmount<Jetton>,
    sqrtPriceLimitX96?: bigint,
  ): Promise<[JettonAmount<Jetton>, Pool]> {
    invariant(this.involvesToken(inputAmount.jetton), 'TOKEN');

    const zeroForOne = inputAmount.jetton.equals(this.jetton0);

    const {
      amountCalculated: outputAmount,
      sqrtRatioX96,
      liquidity,
      tickCurrent,
    } = await this.swap(zeroForOne, inputAmount.quotient, sqrtPriceLimitX96);
    const outputToken = zeroForOne ? this.jetton1 : this.jetton0;
    return [
      JettonAmount.fromRawAmount(outputToken, outputAmount * NEGATIVE_ONE),
      new Pool(
        this.jetton0,
        this.jetton1,
        this.fee as any,
        sqrtRatioX96,
        liquidity,
        tickCurrent,
        this.tickSpacing,
        this.tickDataProvider,
      ),
    ];
  }

  /**
   * Given a desired output amount of a token, return the computed input amount and a pool with state updated after the trade
   * @param outputAmount the output amount for which to quote the input amount
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @returns The input amount and the pool with updated state
   */
  public async getInputAmount(
    outputAmount: JettonAmount<Jetton>,
    sqrtPriceLimitX96?: bigint,
  ): Promise<[JettonAmount<Jetton>, Pool]> {
    invariant(outputAmount.jetton.isToken && this.involvesToken(outputAmount.jetton), 'TOKEN');

    const zeroForOne = outputAmount.jetton.equals(this.jetton1);

    const {
      amountCalculated: inputAmount,
      sqrtRatioX96,
      liquidity,
      tickCurrent,
    } = await this.swap(zeroForOne, outputAmount.quotient * NEGATIVE_ONE, sqrtPriceLimitX96);

    const inputToken = zeroForOne ? this.jetton0 : this.jetton1;
    return [
      JettonAmount.fromRawAmount(inputToken, inputAmount),
      new Pool(
        this.jetton0,
        this.jetton1,
        this.fee as any,
        sqrtRatioX96,
        liquidity,
        tickCurrent,
        this.tickSpacing,
        this.tickDataProvider,
      ),
    ];
  }

  /**
   * Given a desired output amount of a token, return the computed input amount and a pool with state updated after the trade
   * @param outputAmount the output amount for which to quote the input amount
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @returns The input amount and the pool with updated state
   */
  public async getInputAmountByExactOut(
    outputAmount: JettonAmount<Jetton>,
    sqrtPriceLimitX96?: bigint,
  ): Promise<[JettonAmount<Jetton>, Pool]> {
    invariant(outputAmount.jetton.isToken && this.involvesToken(outputAmount.jetton), 'TOKEN');

    const zeroForOne = outputAmount.jetton.equals(this.jetton1);

    const {
      amountSpecifiedRemaining,
      amountCalculated: inputAmount,
      sqrtRatioX96,
      liquidity,
      tickCurrent,
    } = await this.swap(zeroForOne, outputAmount.quotient * NEGATIVE_ONE, sqrtPriceLimitX96);

    invariant(amountSpecifiedRemaining === 0n, 'INSUFFICIENT_LIQUIDITY');

    const inputToken = zeroForOne ? this.jetton0 : this.jetton1;
    return [
      JettonAmount.fromRawAmount(inputToken, inputAmount),
      new Pool(
        this.jetton0,
        this.jetton1,
        this.fee,
        sqrtRatioX96,
        liquidity,
        tickCurrent,
        this.tickSpacing,
        this.tickDataProvider,
      ),
    ];
  }

  /**
   * Executes a swap
   * @param zeroForOne Whether the amount in is jetton0 or jetton1
   * @param amountSpecified The amount of the swap, which implicitly configures the swap as exact input (positive), or exact output (negative)
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @returns amountCalculated
   * @returns sqrtRatioX96
   * @returns liquidity
   * @returns tickCurrent
   */
  private async swap(
    zeroForOne: boolean,
    amountSpecified: bigint,
    sqrtPriceLimitX96?: bigint,
  ): Promise<{
    amountCalculated: bigint;
    sqrtRatioX96: bigint;
    liquidity: bigint;
    tickCurrent: number;
    amountSpecifiedRemaining: bigint;
  }> {
    if (!sqrtPriceLimitX96)
      sqrtPriceLimitX96 = zeroForOne
        ? TickMath.MIN_SQRT_RATIO + ONE
        : TickMath.MAX_SQRT_RATIO - ONE;

    if (zeroForOne) {
      invariant(sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO, 'RATIO_MIN');
      invariant(sqrtPriceLimitX96 < this.sqrtRatioX96, 'RATIO_CURRENT');
    } else {
      invariant(sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO, 'RATIO_MAX');
      invariant(sqrtPriceLimitX96 > this.sqrtRatioX96, 'RATIO_CURRENT');
    }

    const exactInput = amountSpecified >= ZERO;

    // keep track of swap state

    const state = {
      amountSpecifiedRemaining: amountSpecified,
      amountCalculated: ZERO,
      sqrtPriceX96: this.sqrtRatioX96,
      tick: this.tickCurrent,
      liquidity: this.liquidity,
    };

    // start swap while loop
    while (state.amountSpecifiedRemaining !== ZERO && state.sqrtPriceX96 != sqrtPriceLimitX96) {
      const step: Partial<StepComputations> = {};
      step.sqrtPriceStartX96 = state.sqrtPriceX96;

      // because each iteration of the while loop rounds, we can't optimize this code (relative to the smart contract)
      // by simply traversing to the next available tick, we instead need to exactly replicate
      // tickBitmap.nextInitializedTickWithinOneWord
      [step.tickNext, step.initialized] =
        await this.tickDataProvider.nextInitializedTickWithinOneWord(
          state.tick,
          zeroForOne,
          this.tickSpacing,
        );

      if (step.tickNext < TickMath.MIN_TICK) {
        step.tickNext = TickMath.MIN_TICK;
      } else if (step.tickNext > TickMath.MAX_TICK) {
        step.tickNext = TickMath.MAX_TICK;
      }

      step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.tickNext);
      [state.sqrtPriceX96, step.amountIn, step.amountOut, step.feeAmount] =
        SwapMath.computeSwapStep(
          state.sqrtPriceX96,
          (
            zeroForOne
              ? step.sqrtPriceNextX96 < sqrtPriceLimitX96
              : step.sqrtPriceNextX96 > sqrtPriceLimitX96
          )
            ? sqrtPriceLimitX96
            : step.sqrtPriceNextX96,
          state.liquidity,
          state.amountSpecifiedRemaining,
          this.fee,
        );
      if (exactInput) {
        state.amountSpecifiedRemaining =
          state.amountSpecifiedRemaining - (step.amountIn! + step.feeAmount!);
        state.amountCalculated = state.amountCalculated! - step.amountOut!;
      } else {
        state.amountSpecifiedRemaining = state.amountSpecifiedRemaining! + step.amountOut!;
        state.amountCalculated = state.amountCalculated! + (step.amountIn! + step.feeAmount!);
      }

      // TODO
      if (state.sqrtPriceX96 === step.sqrtPriceNextX96) {
        // if the tick is initialized, run the tick transition
        if (step.initialized) {
          let liquidityNet = BigInt(
            (await this.tickDataProvider.getTick(step.tickNext)).liquidityNet,
          );
          // if we're moving leftward, we interpret liquidityNet as the opposite sign
          // safe because liquidityNet cannot be type(int128).min
          if (zeroForOne) liquidityNet = liquidityNet * NEGATIVE_ONE;

          state.liquidity = LiquidityMath.addDelta(state.liquidity, liquidityNet);
        }

        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
      } else if (state.sqrtPriceX96 !== step.sqrtPriceStartX96) {
        // updated comparison function
        // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
        state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);
      }
    }

    return {
      amountSpecifiedRemaining: state.amountSpecifiedRemaining,
      amountCalculated: state.amountCalculated,
      sqrtRatioX96: state.sqrtPriceX96,
      liquidity: state.liquidity,
      tickCurrent: state.tick,
    };
  }

  public get tickSpacing(): number {
    return TICK_SPACINGS[this.fee];
  }
}
