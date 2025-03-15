import { getHttpEndpoint } from '@orbs-network/ton-access';
import { Address, OpenedContract } from '@ton/core';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { PoolWrapper } from './contracts';
import { Jetton, JettonAmount } from './entities';
import { PoolMessageBuilder } from './messages';
import { TonApiClient } from '@ton-api/client';
import { WalletVersion } from './@types';
import { mnemonicToWalletKey } from '@ton/crypto';
import { setTimeout } from 'timers/promises';

const poolAddr = 'EQCtpowhg8efNm364J51zDiKNT_CNnApUU-bor5Jpd7HzhR3';

const main = async () => {
  const tc = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });

  const { publicKey, secretKey } = await mnemonicToWalletKey(
    'visa bid goose elite grab hidden dilemma blur album depend print private bird marriage ceiling address pass guide useless label manage drum conduct digital'.split(
      ' ',
    ),
  );
  const wallet = WalletContractV4.create({
    publicKey,
    workchain: 0,
  });
  const walletContract = tc.open(wallet);
  const sender = walletContract.sender(secretKey);

  const ta = new TonApiClient({
    baseUrl: `https://testnet.tonapi.io`,
    apiKey: 'AGSNOVUCGDJF32AAAAANN2LHR6HNAGLSAAHD4X3MNJGOJNJ45MAK4JNTWOT3V5RHGNJC5QY',
  });
  const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
  const usdcUser = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const orbUser = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
  await Promise.all([
    usdc.setWalletAddress(tc, Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu')),
    orb.setWalletAddress(tc, Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu')),
    usdcUser.setWalletAddress(
      tc,
      Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
    ),
    orbUser.setWalletAddress(tc, Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb')),
  ]);
  const { messages, result } = await PoolMessageBuilder.createEmulatedMintMessage(
    ta,
    WalletVersion.V4R2,
    Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
    Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
    usdc, // router 0
    orb, // router 1
    JettonAmount.fromRawAmount(usdcUser, 1000000000000n), // user 0
    JettonAmount.fromRawAmount(orbUser, 1000000000000n), // user 1
    60, // tick spacing
    3000, // fee
    -240000n, // tick lower
    120000n, // tick upper
    316475945059n,
    Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
  );

  for (const message of messages) {
    await sender.send(message);
    await setTimeout(1000);
  }
};

main().catch((er) => console.log(er));
