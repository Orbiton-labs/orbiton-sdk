import { getHttpEndpoint } from '@orbs-network/ton-access';
import { Address, Cell, OpenedContract } from '@ton/core';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { PoolWrapper } from './contracts';
import { Jetton, JettonAmount, Percent, Pool, Position } from './entities';
import { PoolMessageBuilder } from './messages';
import { TonApiClient } from '@ton-api/client';
import { FeeAmount, WalletVersion } from './@types';
import { mnemonicToWalletKey } from '@ton/crypto';
import { setTimeout } from 'timers/promises';
import { PositionMath, TickMath } from './utils';
import { maxLiquidityForAmounts } from './utils/maxLiquidityForAmounts';
import { Chain, MaxUint256, MINIMUM_LIQUIDITY } from './constants';

const poolAddr = 'EQBDjvLUuBHTFabA5U5YhoXRjTBeh9HKuMNy2us-7j2GBN1Z';
export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

const main = async () => {
  const tc = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });
  const tonApiClient = new TonApiClient({
    baseUrl: `https://testnet.tonapi.io`,
    apiKey: 'AGSNOVUCGDJF32AAAAANN2LHR6HNAGLSAAHD4X3MNJGOJNJ45MAK4JNTWOT3V5RHGNJC5QY',
  });

  const pool = tc.open(PoolWrapper.Pool.createFromAddress(Address.parse(poolAddr)));
  const poolInfo = await pool.getPoolInfo();
  const jettons = await pool.getJettonsWallet();
  const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
  await Promise.all([
    usdc.setWalletAddress(tc, Address.parse('EQCUjc3HQ5T56UY8uYm_b0FMY68uOK8OT67wVwmUXdnLMAq9')),
    orb.setWalletAddress(tc, Address.parse('EQCUjc3HQ5T56UY8uYm_b0FMY68uOK8OT67wVwmUXdnLMAq9')),
  ]);

  const zeroForOne = jettons[0].toString() === usdc.address.toString();
  const emulatedResult = await PoolMessageBuilder.createEmulatedExactInSwapMessage(
    tonApiClient,
    WalletVersion.V4R2,
    Address.parse('0QCmjcMi-GJ32FQe27fmL5n9a1Ab091gahJWaxu0uHasMeGt'),
    JettonAmount.fromRawAmount(usdc, 10000000n),
    orb,
    Number(poolInfo.tickSpacing),
    Number(poolInfo.fee),
    zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
    Address.parse('0QCmjcMi-GJ32FQe27fmL5n9a1Ab091gahJWaxu0uHasMeGt'),
    zeroForOne ? -1 : 0,
    false,
    0,
    Chain.Testnet,
    {
      ROUTER: 'EQCtpowhg8efNm364J51zDiKNT_CNnApUU-bor5Jpd7HzhR3',
      PTON_ROUTER_WALLET: '',
    },
  );

  const transaction = em;
  console.dir(emulatedResult.result.children, { depth: null });
};

main();
