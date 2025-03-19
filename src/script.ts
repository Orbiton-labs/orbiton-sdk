import { getHttpEndpoint } from '@orbs-network/ton-access';
import {
  Address,
  beginCell,
  Cell,
  external,
  internal,
  OpenedContract,
  SendMode,
  storeMessage,
} from '@ton/core';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { PoolWrapper } from './contracts';
import { Jetton, JettonAmount, Percent, Pool, Position } from './entities';
import { PoolMessageBuilder } from './messages';
import { TonApiClient, Trace } from '@ton-api/client';
import { FeeAmount, WalletVersion } from './@types';
import { KeyPair, mnemonicToWalletKey } from '@ton/crypto';
import { setTimeout } from 'timers/promises';
import { PositionMath, TickMath } from './utils';
import { maxLiquidityForAmounts } from './utils/maxLiquidityForAmounts';
import { Chain, MaxUint256, MINIMUM_LIQUIDITY } from './constants';

// Helper function to get wallet from mnemonic
async function getWalletFromMnemonic(
  mnemonic: string[],
  client: TonClient,
): Promise<{ wallet: OpenedContract<WalletContractV4>; keyPair: KeyPair; address: Address }> {
  const keyPair = await mnemonicToWalletKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });
  const walletAddress = wallet.address;
  const openedWallet = client.open(wallet);
  return {
    wallet: openedWallet,
    keyPair,
    address: walletAddress,
  };
}

const poolAddr = 'EQBDjvLUuBHTFabA5U5YhoXRjTBeh9HKuMNy2us-7j2GBN1Z';
export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

const main = async () => {
  const args = process.argv.slice(2);
  const mnemonic = args[0];
  const apiKey = args[1];
  const tc = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });
  const tonApiClient = new TonApiClient({
    baseUrl: `https://testnet.tonapi.io`,
    apiKey,
  });
  const {
    wallet,
    keyPair,
    address: walletAddress,
  } = await getWalletFromMnemonic(mnemonic.split(' '), tc);
  console.log('Wallet address:', walletAddress.toString());
  const pool = tc.open(PoolWrapper.Pool.createFromAddress(Address.parse(poolAddr)));
  const poolInfo = await pool.getPoolInfo();
  const jettons = await pool.getJettonsWallet();
  const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const orb = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 9, 'Orbiton Swap');
  await Promise.all([
    usdc.setWalletAddress(tc, Address.parse('EQAQW9X_hfjQhG3F7Oo_fwP3Ty9lpVnYTydGRcezhaI7nED_')),
    orb.setWalletAddress(tc, Address.parse('EQAQW9X_hfjQhG3F7Oo_fwP3Ty9lpVnYTydGRcezhaI7nED_')),
  ]);

  const zeroForOne = jettons[0].toString() === usdc.address.toString();
  const emulatedResult = await PoolMessageBuilder.createEmulatedExactInSwapMessage(
    tonApiClient,
    WalletVersion.V4R2,
    walletAddress,
    JettonAmount.fromRawAmount(usdc, 10000000n),
    orb,
    Number(poolInfo.tickSpacing),
    Number(poolInfo.fee),
    zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
    walletAddress,
    zeroForOne ? -1 : 0,
    false,
    0,
    Chain.Testnet,
    {
      ROUTER: 'EQAQW9X_hfjQhG3F7Oo_fwP3Ty9lpVnYTydGRcezhaI7nED_',
      PTON_ROUTER_WALLET: 'EQBvcNPONpngiRn8jh9dEdarGlnkykx39YV5Kfo7psxgGEAB',
    },
  );

  const printEmulated = (traceTx: Trace) => {
    const hash = traceTx.transaction.hash;
    const identities = traceTx.interfaces;
    console.log({
      hash,
      identities,
    });
    for (const child of traceTx.children || []) {
      printEmulated(child);
    }
  };
  printEmulated(emulatedResult.result);

  // Get current seqno of the wallet
  const seqno = await wallet.getSeqno();

  // Create the external message to send the swap transaction
  await wallet.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: emulatedResult.messages.map((msg) =>
      internal({
        to: msg.to,
        value: msg.value,
        body: msg.body,
        bounce: true,
      }),
    ),
    sendMode: SendMode.PAY_GAS_SEPARATELY, // Ensure each message pays its own gas
  });

  console.log('Sending transaction...');
  console.log('Transaction sent! Waiting for confirmation...');

  // Wait for transaction to be confirmed (this is a simple approach)
  for (let i = 0; i < 10; i++) {
    await setTimeout(3000); // Wait 3 seconds between checks

    try {
      // Check if transaction was processed
      const walletSeqno = await wallet.getSeqno();
      if (walletSeqno > seqno) {
        console.log('Transaction confirmed!');
        break;
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
    }

    if (i === 9) {
      console.log('Transaction may still be processing. Check explorer for details.');
    }
  }
};

main();
