import { FeeAmount, TICK_SPACINGS } from '../@types';
import { Jetton, Price } from '../entities';
import { encodeSqrtRatioX96 } from './encodeSqrtRatioX96';
import { nearestUsableTick } from './nearestUsableTick';
import { priceToClosestTick } from './priceTickConversions';
import { TickMath } from './tickMath';

export function tryParsePrice(baseJetton?: Jetton, quoteJetton?: Jetton, value?: string) {
  if (!baseJetton || !quoteJetton || !value) {
    return undefined;
  }

  if (!value.match(/^\d*\.?\d+$/)) {
    return undefined;
  }

  const [whole, fraction] = value.split('.');

  const decimals = fraction?.length ?? 0;
  const withoutDecimals = BigInt((whole ?? '') + (fraction ?? ''));

  return new Price(
    baseJetton,
    quoteJetton,
    BigInt(10 ** decimals) * BigInt(10 ** baseJetton.decimals),
    withoutDecimals * BigInt(10 ** quoteJetton.decimals),
  );
}

export function tryParseTick(
  feeAmount?: FeeAmount,
  price?: Price<Jetton, Jetton> | boolean,
): number | undefined {
  if (!price || !feeAmount || typeof price === 'boolean') {
    return undefined;
  }

  let tick: number;

  // check price is within min/max bounds, if outside return min/max
  const sqrtRatioX96 = encodeSqrtRatioX96(price.numerator, price.denominator);

  if (sqrtRatioX96 >= TickMath.MAX_SQRT_RATIO) {
    tick = TickMath.MAX_TICK;
  } else if (sqrtRatioX96 <= TickMath.MIN_SQRT_RATIO) {
    tick = TickMath.MIN_TICK;
  } else {
    // this function is agnostic to the base, will always return the correct tick
    tick = priceToClosestTick(price);
  }

  return nearestUsableTick(tick, TICK_SPACINGS[feeAmount]);
}
