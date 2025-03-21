import { Price } from '../entities/price';
import { Jetton } from '../entities/jetton';
import { Q192 } from '../constants';
import { encodeSqrtRatioX96 } from './encodeSqrtRatioX96';
import { TickMath } from './tickMath';

/**
 * Returns a price object corresponding to the input tick and the base/quote token
 * Inputs must be tokens because the address order is used to interpret the price represented by the tick
 * @param baseToken the base token of the price
 * @param quoteToken the quote token of the price
 * @param tick the tick for which to return the price
 */
export function tickToPrice(
  baseToken: Jetton,
  quoteToken: Jetton,
  tick: number,
): Price<Jetton, Jetton> {
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);

  const ratioX192 = sqrtRatioX96 * sqrtRatioX96;

  return baseToken.sortsBefore(quoteToken)
    ? new Price(baseToken, quoteToken, Q192, ratioX192)
    : new Price(baseToken, quoteToken, ratioX192, Q192);
}

/**
 * Returns the first tick for which the given price is greater than or equal to the tick price
 * @param price for which to return the closest tick that represents a price less than or equal to the input price,
 * i.e. the price of the returned tick is less than or equal to the input price
 */
export function priceToClosestTick(price: Price<Jetton, Jetton>): number {
  const sorted = price.baseJetton.sortsBefore(price.quoteJetton);

  const sqrtRatioX96 = sorted
    ? encodeSqrtRatioX96(price.numerator, price.denominator)
    : encodeSqrtRatioX96(price.denominator, price.numerator);

  let tick = TickMath.getTickAtSqrtRatio(sqrtRatioX96);
  const nextTickPrice = tickToPrice(price.baseJetton, price.quoteJetton, tick + 1);
  if (sorted) {
    if (!price.lessThan(nextTickPrice)) {
      tick++;
    }
  } else if (!price.greaterThan(nextTickPrice)) {
    tick++;
  }
  return tick;
}
