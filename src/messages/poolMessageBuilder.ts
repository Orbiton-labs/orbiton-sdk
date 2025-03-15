import { TonApiClient } from '@ton-api/client';
import {
  Address,
  beginCell,
  Dictionary,
  external,
  internal,
  SenderArguments,
  SendMode,
  storeMessage,
  toNano,
} from '@ton/core';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { Jetton, JettonAmount } from '../entities';
import { PoolWrapper, WalletContract } from '../contracts';
import { storeOpJettonTransferMint, storeOpJettonTransferSwap } from '../tlbs/jetton';
import { WalletVersion } from '../@types';
import { storeOpCreatePool } from '../tlbs/router';
export class PoolMessageBuilder {
  public static gasUsage = {
    CREATE_POOL: toNano(0.1),
    MINT_GAS: toNano(0.5),
    SWAP_GAS: toNano(1.2),
  };

  public static createCreatePoolMessage(
    routerAddress: Address,
    jetton0: Jetton,
    jetton1: Jetton,
    tickSpacing: number,
    fee: number,
    sqrtPriceX96: bigint,
  ): SenderArguments[] {
    if (!jetton0.walletAddress || !jetton1.walletAddress) {
      throw new Error('Router wallet address is not set on jetton1 or jetton0');
    }

    const routerPayloadBuilder = beginCell();
    storeOpCreatePool({
      kind: 'OpCreatePool',
      query_id: 0,
      jetton0_wallet: jetton0.walletAddress,
      jetton1_wallet: jetton1.walletAddress,
      fee,
      tick_spacing: tickSpacing,
      sqrt_price_x96: sqrtPriceX96,
    })(routerPayloadBuilder);
    return [
      {
        to: routerAddress,
        value: this.gasUsage.CREATE_POOL,
        body: routerPayloadBuilder.endCell(),
      },
    ];
  }

  public static createMintMessage(
    routerAddress: Address,
    jetton0Amount: JettonAmount<Jetton>,
    jetton1Amount: JettonAmount<Jetton>,
    tickSpacing: number,
    fee: number,
    tickLower: bigint,
    tickUpper: bigint,
    liquidity: bigint,
    responseAddress: Address,
  ): SenderArguments[] {
    if (!jetton1Amount.jetton.walletAddress || !jetton0Amount.jetton.walletAddress) {
      throw new Error('Router wallet address is not set on jetton1 or jetton0');
    }

    const jetton0PayloadBuilder = beginCell();
    storeOpJettonTransferMint({
      kind: 'OpJettonTransferMint',
      query_id: 0,
      jetton_amount: jetton0Amount.quotient,
      to_address: routerAddress,
      response_address: responseAddress,
      custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
      forward_ton_amount: toNano(0.1),
      either_payload: true,
      mint: {
        kind: 'MintParams',
        forward_opcode: PoolWrapper.Opcodes.Mint,
        jetton1_wallet: jetton1Amount.jetton.walletAddress,
        tick_lower: Number(tickLower),
        tick_upper: Number(tickUpper),
        fee,
        tick_spacing: tickSpacing,
        liquidity_delta: liquidity,
      },
    })(jetton0PayloadBuilder);
    const jetton0Message = {
      to: jetton0Amount.jetton.walletAddress,
      value: toNano(0.15),
      body: jetton0PayloadBuilder.endCell(),
    };

    const jetton1PayloadBuilder = beginCell();
    storeOpJettonTransferMint({
      kind: 'OpJettonTransferMint',
      query_id: 0,
      jetton_amount: jetton1Amount.quotient,
      to_address: routerAddress,
      response_address: responseAddress,
      custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
      forward_ton_amount: toNano(0.35),
      either_payload: true,
      mint: {
        kind: 'MintParams',
        forward_opcode: PoolWrapper.Opcodes.Mint,
        jetton1_wallet: jetton0Amount.jetton.walletAddress,
        tick_lower: Number(tickLower),
        tick_upper: Number(tickUpper),
        fee,
        tick_spacing: tickSpacing,
        liquidity_delta: liquidity,
      },
    })(jetton1PayloadBuilder);

    const jetton1Message = {
      to: jetton1Amount.jetton.walletAddress,
      value: this.gasUsage.MINT_GAS - toNano(0.15),
      body: jetton1PayloadBuilder.endCell(),
    };
    return [jetton0Message, jetton1Message];
  }

  public static async createEmulatedMintMessage(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    routerAddress: Address,
    jetton0Amount: JettonAmount<Jetton>,
    jetton1Amount: JettonAmount<Jetton>,
    tickSpacing: number,
    fee: number,
    tickLower: bigint,
    tickUpper: bigint,
    liquidity: bigint,
    responseAddress: Address,
    workchain: number = 0,
  ) {
    const messages = this.createMintMessage(
      routerAddress,
      jetton0Amount,
      jetton1Amount,
      tickSpacing,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      responseAddress,
    );
    const { seqno } = await tonApiClient.wallet.getAccountSeqno(senderAddress);
    const { publicKey: publicKeyHex } =
      await tonApiClient.accounts.getAccountPublicKey(senderAddress);
    const wallet = WalletContract.create(
      workchain,
      Buffer.from(publicKeyHex, 'hex'),
      walletVersion,
    );
    const dummyKey = (await mnemonicToPrivateKey(await mnemonicNew())).secretKey;
    const tr = wallet.createTransfer({
      seqno,
      secretKey: dummyKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: messages.map((m) => internal(m)),
    });

    // Create external message for emulation
    const bocExternalMessage = beginCell()
      .store(
        storeMessage(
          external({
            to: senderAddress,
            body: tr,
          }),
        ),
      )
      .endCell();

    // Emulate transaction
    const emulateTrace = await tonApiClient.emulation.emulateMessageToTrace(
      { boc: bocExternalMessage },
      { ignore_signature_check: true }, // Ignore signature for execute message from other account
    );
    return {
      messages,
      result: emulateTrace,
    };
  }

  public static createSwapMessage(
    routerAddress: Address,
    jetton0: Jetton,
    jetton1: Jetton,
    tickSpacing: number,
    fee: number,
    jettonAmount: bigint,
    zeroForOne: boolean,
    sqrtPriceLimit: bigint,
    responseAddress: Address,
  ): SenderArguments[] {
    if (!jetton0.walletAddress || !jetton1.walletAddress) {
      throw new Error('Router wallet address is not set on jetton1 or jetton0');
    }

    if (zeroForOne) {
      const jettonPayloadBuilder = beginCell();
      storeOpJettonTransferSwap({
        kind: 'OpJettonTransferSwap',
        query_id: 0,
        jetton_amount: jettonAmount,
        to_address: routerAddress,
        response_address: responseAddress,
        custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
        forward_ton_amount: toNano(0.8),
        either_payload: true,
        swap: {
          kind: 'SwapParams',
          forward_opcode: PoolWrapper.Opcodes.Swap,
          fee,
          jetton1_wallet: jetton1.walletAddress,
          //eslint-di
          sqrt_price_limit: sqrtPriceLimit,
          tick_spacing: tickSpacing,
          zero_for_one: zeroForOne ? -1 : 0,
        },
      })(jettonPayloadBuilder);

      return [
        {
          to: jetton0.walletAddress,
          value: this.gasUsage.SWAP_GAS,
          body: jettonPayloadBuilder.endCell(),
        },
      ];
    } else {
      const jettonPayloadBuilder = beginCell();
      storeOpJettonTransferSwap({
        kind: 'OpJettonTransferSwap',
        query_id: 0,
        jetton_amount: jettonAmount,
        to_address: routerAddress,
        response_address: responseAddress,
        custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
        forward_ton_amount: toNano(0.8),
        either_payload: true,
        swap: {
          kind: 'SwapParams',
          forward_opcode: PoolWrapper.Opcodes.Swap,
          fee,
          jetton1_wallet: jetton0.walletAddress,
          //eslint-di
          sqrt_price_limit: sqrtPriceLimit,
          tick_spacing: tickSpacing,
          zero_for_one: zeroForOne ? -1 : 0,
        },
      })(jettonPayloadBuilder);

      return [
        {
          to: jetton1.walletAddress,
          value: this.gasUsage.SWAP_GAS,
          body: jettonPayloadBuilder.endCell(),
        },
      ];
    }
  }

  public static async createEmulatedSwapMessage(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    routerAddress: Address,
    jetton0: Jetton,
    jetton1: Jetton,
    tickSpacing: number,
    fee: number,
    jettonAmount: bigint,
    zeroForOne: boolean,
    sqrtPriceLimit: bigint,
    responseAddress: Address,
    workchain: number = 0,
  ) {
    const messages = this.createSwapMessage(
      routerAddress,
      jetton0,
      jetton1,
      tickSpacing,
      fee,
      jettonAmount,
      zeroForOne,
      sqrtPriceLimit,
      responseAddress,
    );
    const { seqno } = await tonApiClient.wallet.getAccountSeqno(senderAddress);
    const { publicKey: publicKeyHex } =
      await tonApiClient.accounts.getAccountPublicKey(senderAddress);
    const wallet = WalletContract.create(
      workchain,
      Buffer.from(publicKeyHex, 'hex'),
      walletVersion,
    );
    const dummyKey = (await mnemonicToPrivateKey(await mnemonicNew())).secretKey;
    const tr = wallet.createTransfer({
      seqno,
      secretKey: dummyKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: messages.map((m) => internal(m)),
    });

    // Create external message for emulation
    const bocExternalMessage = beginCell()
      .store(
        storeMessage(
          external({
            to: senderAddress,
            body: tr,
          }),
        ),
      )
      .endCell();

    // Emulate transaction
    const emulateTrace = await tonApiClient.emulation.emulateMessageToTrace(
      { boc: bocExternalMessage },
      { ignore_signature_check: true }, // Ignore signature for execute message from other account
    );
    return {
      messages,
      result: emulateTrace,
    };
  }
}
