import { beforeEach, describe, expect, it, beforeAll } from 'bun:test';
import { FeeAmount, TICK_SPACINGS } from '../@types';
import { NEGATIVE_ONE } from '../constants';
import { encodeSqrtRatioX96 } from '../utils/encodeSqrtRatioX96';
import { nearestUsableTick } from '../utils/nearestUsableTick';
import { TickMath } from '../utils/tickMath';
import { Pool } from './pool';
import { Jetton } from './jetton';
import { Address } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';
import { JettonAmount } from './jettonAmount';

const ONE_ETHER = 10n ** 18n;

const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
const dedust = new Jetton('EQBXJHKfXkPHxs8Ex9yy8gu6DWm9_FgoPCMJfx-tZlDIm_Dk', 9, 'Dedust');

describe('Pool', () => {
  beforeAll(async () => {
    const tonClient = new TonClient({
      endpoint: await getHttpEndpoint({
        network: 'testnet',
      }),
    });
    await usdc.setWalletAddress(
      tonClient,
      Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
    );
    await orb.setWalletAddress(
      tonClient,
      Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
    );
  });

  describe('constructor', () => {
    it('fee must be integer', () => {
      expect(() => {
        return new Pool(usdc, orb, FeeAmount.MEDIUM + 0.5, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      }).toThrow('FEE');
    });

    it('fee cannot be more than 1e6', () => {
      expect(() => {
        // @ts-ignore
        return new Pool(usdc, orb, 1e6, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      }).toThrow('FEE');
    });

    it('cannot be given two of the same token', () => {
      expect(() => {
        return new Pool(usdc, usdc, FeeAmount.MEDIUM, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      }).toThrow('ADDRESSES');
    });

    it.skip('price must be within tick price bounds', () => {
      expect(() => {
        return new Pool(usdc, orb, FeeAmount.MEDIUM, encodeSqrtRatioX96(1, 1), 0, 1, 50, []);
      }).toThrow('PRICE_BOUNDS');
      expect(() => {
        return new Pool(usdc, orb, FeeAmount.MEDIUM, encodeSqrtRatioX96(1, 1) + 1n, 0, -1, 50, []);
      }).toThrow('PRICE_BOUNDS');
    });

    it('works with valid arguments for empty pool medium fee', () => {
      return new Pool(usdc, orb, FeeAmount.MEDIUM, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
    });

    it('works with valid arguments for empty pool low fee', () => {
      return new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
    });

    it('works with valid arguments for empty pool lowest fee', () => {
      return new Pool(usdc, orb, FeeAmount.LOWEST, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
    });

    it('works with valid arguments for empty pool high fee', () => {
      return new Pool(usdc, orb, FeeAmount.HIGH, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
    });
  });

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      let pool = new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      expect(pool.jetton0).toEqual(usdc);
      pool = new Pool(orb, usdc, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      expect(pool.jetton1).toEqual(orb);
    });
  });
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      let pool = new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      expect(pool.jetton1).toEqual(orb);
      pool = new Pool(orb, usdc, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      expect(pool.jetton0).toEqual(usdc);
    });
  });

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(
        new Pool(
          usdc,
          orb,
          FeeAmount.LOW,
          encodeSqrtRatioX96(101e9, 100e9),
          0,
          TickMath.getTickAtSqrtRatio(encodeSqrtRatioX96(101e9, 100e9)),
          50,
          [],
        ).jetton0Price.toSignificant(5),
      ).toEqual('1.01');
      expect(
        new Pool(
          orb,
          usdc,
          FeeAmount.LOW,
          encodeSqrtRatioX96(101e9, 100e9),
          0,
          TickMath.getTickAtSqrtRatio(encodeSqrtRatioX96(101e9, 100e9)),
          50,
          [],
        ).jetton0Price.toSignificant(5),
      ).toEqual('1.01');
    });
  });

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(
        new Pool(
          usdc,
          orb,
          FeeAmount.LOW,
          encodeSqrtRatioX96(101e9, 100e9),
          0,
          TickMath.getTickAtSqrtRatio(encodeSqrtRatioX96(101e9, 100e9)),
          50,
          [],
        ).jetton1Price.toSignificant(5),
      ).toEqual('0.9901');
      expect(
        new Pool(
          orb,
          usdc,
          FeeAmount.LOW,
          encodeSqrtRatioX96(101e9, 100e9),
          0,
          TickMath.getTickAtSqrtRatio(encodeSqrtRatioX96(101e9, 100e9)),
          50,
          [],
        ).jetton1Price.toSignificant(5),
      ).toEqual('0.9901');
    });
  });

  describe('#priceOf', () => {
    const pool = new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
    it('returns price of token in terms of other token', () => {
      expect(pool.priceOf(orb)).toEqual(pool.jetton1Price);
      expect(pool.priceOf(usdc)).toEqual(pool.jetton0Price);
    });

    it('throws if invalid token', () => {
      expect(() => pool.priceOf(dedust)).toThrow('TOKEN');
    });
  });

  describe('#involvesToken', () => {
    it('returns involves token', () => {
      const pool = new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), 0, 0, 50, []);
      expect(pool.involvesToken(usdc)).toEqual(true);
      expect(pool.involvesToken(orb)).toEqual(true);
      expect(pool.involvesToken(dedust)).toEqual(false);
    });
  });

  describe('swaps', () => {
    let pool: Pool;

    console.log(
      {
        index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[FeeAmount.LOW]),
        liquidityNet: ONE_ETHER,
        liquidityGross: ONE_ETHER,
      },
      {
        index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[FeeAmount.LOW]),
        liquidityNet: ONE_ETHER * NEGATIVE_ONE,
        liquidityGross: ONE_ETHER,
      },
    );
    beforeEach(() => {
      pool = new Pool(usdc, orb, FeeAmount.LOW, encodeSqrtRatioX96(1, 1), ONE_ETHER, 0, 1, [
        {
          index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[FeeAmount.LOW]),
          liquidityNet: ONE_ETHER,
          liquidityGross: ONE_ETHER,
        },
        {
          index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[FeeAmount.LOW]),
          liquidityNet: ONE_ETHER * NEGATIVE_ONE,
          liquidityGross: ONE_ETHER,
        },
      ]);
    });

    describe('#getOutputAmount', () => {
      it('USDC -> DAI', async () => {
        const inputAmount = JettonAmount.fromRawAmount(orb, 100);
        const [outputAmount] = await pool.getOutputAmount(inputAmount);
        expect(outputAmount.jetton.equals(usdc)).toBe(true);
        expect(outputAmount.quotient).toEqual(98n);
      });

      it('DAI -> USDC', async () => {
        const inputAmount = JettonAmount.fromRawAmount(usdc, 100);
        const [outputAmount] = await pool.getOutputAmount(inputAmount);
        expect(outputAmount.jetton.equals(orb)).toBe(true);
        expect(outputAmount.quotient).toEqual(98n);
      });
    });

    describe('#getInputAmount', () => {
      it('USDC -> DAI', async () => {
        const outputAmount = JettonAmount.fromRawAmount(orb, 98);
        const [inputAmount] = await pool.getInputAmount(outputAmount);
        expect(inputAmount.jetton.equals(usdc)).toBe(true);
        expect(inputAmount.quotient).toEqual(100n);
      });

      it('DAI -> USDC', async () => {
        const outputAmount = JettonAmount.fromRawAmount(usdc, 98);
        const [inputAmount] = await pool.getInputAmount(outputAmount);
        expect(inputAmount.jetton.equals(orb)).toBe(true);
        expect(inputAmount.quotient).toEqual(100n);
      });
    });
  });

  describe('#bigNums', () => {
    let pool: Pool;
    const bigNum1 = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    const bigNum2 = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    beforeEach(() => {
      pool = new Pool(
        usdc,
        orb,
        FeeAmount.LOW,
        encodeSqrtRatioX96(bigNum1, bigNum2),
        ONE_ETHER,
        0,
        TICK_SPACINGS[FeeAmount.LOW],
        [
          {
            index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[FeeAmount.LOW]),
            liquidityNet: ONE_ETHER,
            liquidityGross: ONE_ETHER,
          },
          {
            index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[FeeAmount.LOW]),
            liquidityNet: ONE_ETHER * NEGATIVE_ONE,
            liquidityGross: ONE_ETHER,
          },
        ],
      );
    });

    describe('#priceLimit', () => {
      it('correctly compares two BigIntegers', async () => {
        expect(bigNum1).toEqual(bigNum2);
      });
      it('correctly handles two BigIntegers', async () => {
        const inputAmount = JettonAmount.fromRawAmount(usdc, 100);
        const [outputAmount] = await pool.getOutputAmount(inputAmount);
        pool.getInputAmount(outputAmount);
        expect(outputAmount.jetton.equals(orb)).toBe(true);
        // if output is correct, function has succeeded
      });
    });
  });
});
