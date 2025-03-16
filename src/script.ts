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
import { MaxUint256 } from './constants';

const poolAddr = 'EQCtpowhg8efNm364J51zDiKNT_CNnApUU-bor5Jpd7HzhR3';

const main = async () => {
  const tc = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });

  const pool = tc.open(PoolWrapper.Pool.createFromAddress(Address.parse(poolAddr)));
  const poolInfo = await pool.getPoolInfo();

  // const { publicKey, secretKey } = await mnemonicToWalletKey(''.split(' '));
  // const wallet = WalletContractV4.create({
  //   publicKey,
  //   workchain: 0,
  // });
  // const walletContract = tc.open(wallet);
  // const sender = walletContract.sender(secretKey);

  // const ta = new TonApiClient({
  //   baseUrl: `https://testnet.tonapi.io`,
  //   apiKey: '',
  // });
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
  // const { messages, result } = await PoolMessageBuilder.createEmulatedMintMessage(
  //   ta,
  //   WalletVersion.V4R2,
  //   Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
  //   Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
  //   usdc, // router 0
  //   orb, // router 1
  //   JettonAmount.fromRawAmount(usdcUser, 1000000000000n), // user 0
  //   JettonAmount.fromRawAmount(orbUser, 1000000000000n), // user 1
  //   60, // tick spacing
  //   3000, // fee
  //   -240000n, // tick lower
  //   120000n, // tick upper
  //   316475945059n,
  //   Address.parse('0QBkxNmedeIS12e9bD0PO6nPaRMpU3dnijh90OH5Dtjqpbjb'),
  // );

  // for (const message of messages) {
  //   await sender.send(message);
  //   await setTimeout(1000);
  // }

  // const cell = Cell.fromBoc(
  //   Buffer.from(
  //     'b5ee9c720101030100da000285800c989b33cebc425aecf7ad87a1e77539ed22652a6eecf1470fba1c3f21db1d54b00193136679d7884b5d9ef5b0f43ceea73da44ca54ddd9e28e1f74387e43b63aa96010200ce0000000000000000000000000000000000000000000000000000001735de120800000000000000000000000000000000000000000000000000000002540be400000000000000000050f6efdcc3dcdce8de36503c00000000000000000000d65d599a4da2ffa60f005000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  //     'hex',
  //   ),
  // )[0];
  // const fistRef = cell.asSlice().loadRef().beginParse();
  // const amount0 = fistRef.loadInt(256);
  // const amount1 = fistRef.loadInt(256);
  // const sqrtPriceX96 = fistRef.loadUintBig(160);
  // console.log({ amount0, amount1, sqrtPriceX96 });

  const sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(-24060);
  const sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(-22080);
  console.log({ sqrtRatioAX96, sqrtRatioBX96 });
  console.log(poolInfo.tick);
  console.log({
    sqrtRatioCurrentX96: 25060680620470481165591749524n,
    sqrtRatioAX96,
    sqrtRatioBX96,
    amount0: 4999999999n + 1n, // 5 usdc
    amount1: MaxUint256,
    useFullPrecision: false,
  });
  // ạksdhlaksdjalsksd
  const liquidity = maxLiquidityForAmounts(
    25060680620470481165591749524n,
    sqrtRatioAX96,
    sqrtRatioBX96,
    4999999999n + 1n,
    MaxUint256,
    true,
  );
  console.log('V1:', { liquidity });
  const position = Position.fromAmount0({
    pool: new Pool(
      usdc,
      orb,
      FeeAmount.MEDIUM,
      25060680620470481165591749524n,
      235765193386072n,
      Number(-23022),
      Number(60),
    ),
    amount0: 4999999999n + 1n,
    tickLower: -24060,
    tickUpper: -22080,
    useFullPrecision: true,
  });
  const { amount0, amount1 } = position;
  console.log({
    sqrtRatioCurrentX96: 25060680620470481165591749524n,
    sqrtRatioAX96,
    sqrtRatioBX96,
    amount0: 4999999999n + 1n,
    amount1: amount1.quotient,
    useFullPrecision: false,
  });
  // ạksdhlaksdjalsksd
  const newLiquidity = maxLiquidityForAmounts(
    25060680620470481165591749524n,
    sqrtRatioAX96,
    sqrtRatioBX96,
    4999999999n + 1n,
    amount1.quotient,
    true,
  );
  console.log('V2:', { newLiquidity });
};

main();
