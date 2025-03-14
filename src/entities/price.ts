import invariant from 'tiny-invariant';
import { BigintIsh } from '../@types';
import { Fraction } from '.';
import { Rounding } from '../enums/rounding';
import { Jetton } from './jetton';
import { JettonAmount } from './jettonAmount';

export class Price<TBase extends Jetton, TQuote extends Jetton> extends Fraction {
  public readonly baseJetton: TBase; // input i.e. denominator
  public readonly quoteJetton: TQuote; // output i.e. numerator

  public readonly scalar: Fraction; // used to adjust the raw fraction w/r/t the decimals of the {base,quote}Token

  /**
   * Construct a price, either with the base and quote currency amount, or the
   * @param args
   */
  public constructor(
    ...args:
      | [TBase, TQuote, BigintIsh, BigintIsh]
      | [
          {
            baseAmount: JettonAmount<TBase>;
            quoteAmount: JettonAmount<TQuote>;
          },
        ]
  ) {
    let baseJetton: TBase;
    let quoteJetton: TQuote;
    let denominator: BigintIsh;
    let numerator: BigintIsh;

    if (args.length === 4) {
      [baseJetton, quoteJetton, denominator, numerator] = args;
    } else {
      const result = args[0].quoteAmount.divide(args[0].baseAmount);
      [baseJetton, quoteJetton, denominator, numerator] = [
        args[0].baseAmount.jetton,
        args[0].quoteAmount.jetton,
        result.denominator,
        result.numerator,
      ];
    }
    super(numerator, denominator);

    this.baseJetton = baseJetton;
    this.quoteJetton = quoteJetton;
    this.scalar = new Fraction(
      10n ** BigInt(baseJetton.decimals),
      10n ** BigInt(quoteJetton.decimals),
    );
  }

  /**
   * Flip the price, switching the base and quote currency
   */
  public invert(): Price<TQuote, TBase> {
    return new Price(this.quoteJetton, this.baseJetton, this.numerator, this.denominator);
  }

  /**
   * Multiply the price by another price, returning a new price. The other price must have the same base currency as this price's quote currency
   * @param other the other price
   */
  public multiply<TOtherQuote extends Jetton>(
    other: Price<TQuote, TOtherQuote>,
  ): Price<TBase, TOtherQuote> {
    invariant(this.quoteJetton.equals(other.baseJetton), 'TOKEN');
    const fraction = super.multiply(other);
    return new Price(this.baseJetton, other.quoteJetton, fraction.denominator, fraction.numerator);
  }

  /**
   * Return the amount of quote currency corresponding to a given amount of the base currency
   * @param currencyAmount the amount of base currency to quote against the price
   */
  public quote(currencyAmount: JettonAmount<TBase>): JettonAmount<TQuote> {
    invariant(currencyAmount.jetton.equals(this.baseJetton), 'TOKEN');
    const result = super.multiply(currencyAmount);
    return JettonAmount.fromFractionalAmount(
      this.quoteJetton,
      result.numerator,
      result.denominator,
    );
  }

  /**
   * Get the value scaled by decimals for formatting
   * @private
   */
  private get adjustedForDecimals(): Fraction {
    return super.multiply(this.scalar);
  }

  public toSignificant(
    significantDigits: number = 6,
    format?: object,
    rounding?: Rounding,
  ): string {
    return this.adjustedForDecimals.toSignificant(significantDigits, format, rounding);
  }

  public toFixed(decimalPlaces: number = 4, format?: object, rounding?: Rounding): string {
    return this.adjustedForDecimals.toFixed(decimalPlaces, format, rounding);
  }

  /* new for TONCO */
  public get asFraction(): Fraction {
    return new Fraction(this.adjustedForDecimals.numerator, this.adjustedForDecimals.denominator);
  }
}
