import { Address, TonClient } from '@ton/ton';
import { Jetton, JettonAmount } from '../entities';
import { encodeSqrtRatioX96 } from './encodeSqrtRatioX96';
import { LiquidityMath } from './liquidityMath';
import { getHttpEndpoint } from '@orbs-network/ton-access';

const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');

describe('#getLiquidityBySingleAmount', () => {
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
  it('input with token 0 amount', () => {
    const amount = LiquidityMath.getLiquidityBySingleAmount({
      amount: JettonAmount.fromRawAmount(usdc, '100'),
      currency: orb,
      tickLower: -953,
      tickUpper: 953,
      sqrtRatioX96: encodeSqrtRatioX96(1, 1),
    });
    expect(amount).toEqual(2149n);
  });

  it('input with token 1 amount', () => {
    const amount = LiquidityMath.getLiquidityBySingleAmount({
      amount: JettonAmount.fromRawAmount(orb, '200'),
      currency: usdc,
      tickLower: -953,
      tickUpper: 953,
      sqrtRatioX96: encodeSqrtRatioX96(1, 1),
    });
    expect(amount).toEqual(4298n);
  });
});
