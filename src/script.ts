import { getHttpEndpoint } from '@orbs-network/ton-access';
import { Address, OpenedContract } from '@ton/core';
import { TonClient } from '@ton/ton';
import { PoolWrapper } from './contracts';
import { Jetton, JettonAmount } from './entities';
import { PoolMessageBuilder } from './messages';
import { TonApiClient } from '@ton-api/client';
import { WalletVersion } from './@types';

const poolAddr = 'EQCtpowhg8efNm364J51zDiKNT_CNnApUU-bor5Jpd7HzhR3';

const main = async () => {
  const tc = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });
  // const poolContract = new PoolWrapper.Pool(Address.parse(poolAddr));
  // const pool = client.open(poolContract) as OpenedContract<PoolWrapper.Pool>;
  // const ticksInfo = await pool.getTicks().catch((err) => {
  //   console.log(err);
  //   return null;
  // });
  // console.log(ticksInfo);

  // const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  // const usdcAmount = JettonAmount.fromRawAmount(usdc, 1000000000000000000n);
  // console.log(usdcAmount.toSignificant());

  const ta = new TonApiClient({
    baseUrl: `https://testnet.tonapi.io`,
    apiKey: 'AGSNOVUCGDJF32AAAAANN2LHR6HNAGLSAAHD4X3MNJGOJNJ45MAK4JNTWOT3V5RHGNJC5QY',
  });
  const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
  await Promise.all([
    usdc.setWalletAddress(tc, Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb')),
    orb.setWalletAddress(tc, Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb')),
  ]);
  const { messages, result } = await PoolMessageBuilder.createEmulatedMintMessage(
    ta,
    WalletVersion.V4R2,
    Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
    Address.parse('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ'),
    JettonAmount.fromRawAmount(usdc, 1000000000000n),
    JettonAmount.fromRawAmount(orb, 1000000000000n),
    3000,
    60,
    -240000n,
    120000n,
    316475945059n,
    Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
  );
  console.dir(result, { depth: null });
};

main().catch((er) => console.log(er));
