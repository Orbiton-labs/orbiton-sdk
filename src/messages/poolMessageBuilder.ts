import { Address, beginCell, Dictionary, SenderArguments, toNano } from '@ton/core';
import { Jetton, JettonAmount } from '../entities';
import { PoolWrapper } from '../contracts';
import { storeOpJettonTransferMint } from '../tlbs/jetton';
import { TonApiClient } from '@ton-api/client';
export class PoolMessageBuilder {
  public static gasUsage = {
    MINT_GAS: toNano(0.5),
  };

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

  // public static createEmulatedMintMessage(
  //   tonApiClient: TonApiClient,
  //   senderAddress: Address,
  //   routerAddress: Address,
  //   jetton0Amount: JettonAmount<Jetton>,
  //   jetton1Amount: JettonAmount<Jetton>,
  //   tickSpacing: number,
  //   fee: number,
  //   tickLower: bigint,
  //   tickUpper: bigint,
  //   responseAddress: Address,
  // ) {
  //   const messages = this.createMintMessage(
  //     routerAddress,
  //     jetton0Amount,
  //     jetton1Amount,
  //     tickSpacing,
  //     fee,
  //     tickLower,
  //     tickUpper,
  //     senderAddress,
  //   );
  // }
}
