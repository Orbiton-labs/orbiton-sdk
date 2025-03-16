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
import { MintParams, storeMintParams, storeOpJettonTransferMint, storeOpJettonTransferSwap, storeSwapParams, SwapParams } from '../tlbs/jetton';
import { WalletVersion } from '../@types';
import { storeOpCreatePool } from '../tlbs/router';
import { Position } from '../entities/position';
import { Chain, ContractAddresses, ContractAddressesFromChain } from '../constants';
import { PTonWalletWrapper } from '../contracts/core/PTonWallet';
import { BurnPositionMessage, storeBurnPositionMessage, CollectMessage, storeCollectMessage } from '../tlbs/position';
import { computePositionAddress } from '../functions/computePositionAddress';

export class PoolMessageBuilder {
  public static gasUsage = {
    CREATE_POOL: toNano(0.1),
    MINT_GAS: toNano(0.8),
    SWAP_GAS: toNano(1.2),
    BURN_GAS: toNano(0.3),
    COLLECT_GAS: toNano(0.3),
  };

  /**
   * Creates a message to create a new pool
   */
  public static createCreatePoolMessage(
    
    jetton0: Jetton,
    jetton1: Jetton,
    tickSpacing: number,
    fee: number,
    sqrtPriceX96: bigint,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ): SenderArguments[] {
    this.validateJettonWallets([jetton0, jetton1]);

    const { ROUTER } = customContractAddresses ?? ContractAddressesFromChain[chain];
    const routerAddress = Address.parse(ROUTER);
    const routerPayloadBuilder = beginCell();
    storeOpCreatePool({
      kind: 'OpCreatePool',
      query_id: 0,
      jetton0_wallet: jetton0.walletAddress!,
      jetton1_wallet: jetton1.walletAddress!,
      fee,
      tick_spacing: tickSpacing,
      sqrt_price_x96: sqrtPriceX96,
      jetton_master_ref: {
        kind: 'JettonMasterRef',
        jetton0_master: jetton0.address,
        jetton1_master: jetton1.address,
      },
    })(routerPayloadBuilder);
    
    return [
      {
        to: routerAddress,
        value: this.gasUsage.CREATE_POOL,
        body: routerPayloadBuilder.endCell(),
      },
    ];
  }

  /**
   * Creates a message to mint a position
   */
  public static createMintMessage(
    jetton0Router: Jetton,
    jetton1Router: Jetton,
    jetton0Amount: JettonAmount<Jetton>,
    jetton1Amount: JettonAmount<Jetton>,
    position: Position,
    responseAddress: Address,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ): SenderArguments[] {
    const { tickLower, tickUpper, liquidity, pool } = position;
    const { tickSpacing, fee } = pool;
    const { ROUTER, PTON_ROUTER_WALLET } = customContractAddresses ?? ContractAddressesFromChain[chain];
    
    // Validate all wallet addresses
    this.validateJettonWallets([
      jetton0Router, 
      jetton1Router, 
      jetton0Amount.jetton, 
      jetton1Amount.jetton
    ]);

    // Sort jettons if needed
    const { 
      jetton0, 
      jetton1, 
      amount0, 
      amount1 
    } = this.sortJettonsIfNeeded(
      jetton0Router, 
      jetton1Router, 
      jetton0Amount, 
      jetton1Amount
    );

    // Create mint parameters
    const mintParams0 = this.createMintParams(jetton1.walletAddress!, tickLower, tickUpper, fee, tickSpacing, liquidity);
    const mintParams1 = this.createMintParams(jetton0.walletAddress!, tickLower, tickUpper, fee, tickSpacing, liquidity);

    // Create messages
    const jetton0Message = this.createJettonMessage(
      jetton0, 
      amount0, 
      mintParams0, 
      responseAddress, 
      ROUTER, 
      PTON_ROUTER_WALLET,
      toNano(0.2)
    );

    const jetton1Message = this.createJettonMessage(
      jetton1, 
      amount1, 
      mintParams1, 
      responseAddress, 
      PTON_ROUTER_WALLET, 
      ROUTER,
      this.gasUsage.MINT_GAS - toNano(0.2)
    );

    return [jetton0Message, jetton1Message];
  }

  /**
   * Creates a message for exact-in swap
   */
  public static createExactInSwapMessage(
    amount: JettonAmount<Jetton>,
    desiredJetton: Jetton,
    tickSpacing: number,
    fee: number,
    sqrtPriceLimit: bigint,
    responseAddress: Address,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ): SenderArguments[] {
    const { ROUTER, PTON_ROUTER_WALLET } = customContractAddresses ?? ContractAddressesFromChain[chain];
    const routerAddress = Address.parse(ROUTER);

    this.validateJettonWallets([amount.jetton, desiredJetton]);
    
    const isSorted = PoolWrapper.Pool.isSorted(amount.jetton.walletAddress!, desiredJetton.walletAddress!);
    const zeroForOne = isSorted ? -1 : 0;

    const swapParams = this.createSwapParams(
      fee, 
      desiredJetton.walletAddress!, 
      sqrtPriceLimit, 
      tickSpacing, 
      zeroForOne
    );

    const isTonToJetton = amount.jetton.address.equals(Address.parse(PTON_ROUTER_WALLET));

    if (isTonToJetton) {
      return this.createTonToJettonSwapMessage(
        amount, 
        swapParams, 
        responseAddress, 
        PTON_ROUTER_WALLET
      );
    } else {
      return this.createJettonToJettonSwapMessage(
        amount, 
        swapParams, 
        responseAddress, 
        routerAddress
      );
    }
  }

  /**
   * Creates a message to burn a position
   */
  public static createBurnMessage(
    position: Position,
    owner: Address,
    poolAddress: Address,
    liquidityDelta: bigint,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ): SenderArguments[] {
    const burnMessage: BurnPositionMessage = {
      kind: 'BurnPositionMessage',
      query_id: 0,
      body: {
        kind: 'BurnPositionParams',
        liquidity_delta: liquidityDelta,
      },
    };

    const body = beginCell();
    storeBurnPositionMessage(burnMessage)(body);
    
    const {tickLower, tickUpper} = position;
    const positionAddress = computePositionAddress(
      poolAddress, 
      owner, 
      BigInt(tickLower), 
      BigInt(tickUpper)
    );

    return [
      {
        to: positionAddress,
        value: this.gasUsage.BURN_GAS,
        body: body.endCell(),
      },
    ];
  }

  /**
   * Creates an emulated mint message
   */
  public static async createEmulatedMintMessage(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    jetton0Router: Jetton,
    jetton1Router: Jetton,
    jetton0Amount: JettonAmount<Jetton>,
    jetton1Amount: JettonAmount<Jetton>,
    position: Position,
    responseAddress: Address,
    workchain: number = 0,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ) {
    const messages = this.createMintMessage(
      jetton0Router,
      jetton1Router,
      jetton0Amount,
      jetton1Amount,
      position,
      responseAddress,
      chain,
      customContractAddresses,
    );
    
    return this.emulateMessages(
      tonApiClient,
      walletVersion,
      senderAddress,
      messages,
      workchain,
      chain,
      customContractAddresses,
    );
  }

  /**
   * Creates an emulated exact-in swap message
   */
  public static async createEmulatedExactInSwapMessage(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    amount: JettonAmount<Jetton>,
    desiredJetton: Jetton,
    tickSpacing: number,
    fee: number,
    sqrtPriceLimit: bigint,
    responseAddress: Address,
    workchain: number = 0,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ) {
    const messages = this.createExactInSwapMessage(
      amount,
      desiredJetton,
      tickSpacing,
      fee,
      sqrtPriceLimit,
      responseAddress,
      chain,
      customContractAddresses,
    );
    
    return this.emulateMessages(
      tonApiClient,
      walletVersion,
      senderAddress,
      messages,
      workchain,
      chain,
      customContractAddresses,
    );
  }

  /**
   * Creates an emulated burn message
   */
  public static async createEmulatedBurnMessage(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    position: Position,
    owner: Address,
    poolAddress: Address,
    workchain: number = 0,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ) {
    const messages = this.createBurnMessage(
      position, 
      owner, 
      poolAddress, 
      position.liquidity,
      chain,
      customContractAddresses,
    );
    
    return this.emulateMessages(
      tonApiClient,
      walletVersion,
      senderAddress,
      messages,
      workchain,
      chain,
      customContractAddresses,
    );
  }

  /**
   * Creates a message to collect tokens from a position
   */
  public static createCollectMessage(
    position: Position,
    owner: Address,
    poolAddress: Address,
    recipient: Address,
    amount0Requested: bigint,
    amount1Requested: bigint,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ) {
    const collectMessage: CollectMessage = {
      kind: 'CollectMessage',
      query_id: 0,
      body: {
        kind: 'CollectParams',
        recipient,
        amount_0_requested: amount0Requested,
        amount_1_requested: amount1Requested,
      }
    };

    const body = beginCell();
    storeCollectMessage(collectMessage)(body);
    
    const {tickLower, tickUpper} = position;
    const positionAddress = computePositionAddress(
      poolAddress,
      owner,
      BigInt(tickLower),
      BigInt(tickUpper)
    );

    return [
      {
        to: positionAddress,
        value: this.gasUsage.COLLECT_GAS,
        body: body.endCell(),
      }
    ]
  } 

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validates that all jettons have wallet addresses
   */
  private static validateJettonWallets(jettons: Jetton[]): void {
    for (const jetton of jettons) {
      if (!jetton.walletAddress) {
        throw new Error('Router wallet address is not set on one or more jettons');
      }
    }
  }

  /**
   * Sorts jettons if needed based on wallet addresses
   */
  private static sortJettonsIfNeeded(
    jetton0: Jetton,
    jetton1: Jetton,
    amount0: JettonAmount<Jetton>,
    amount1: JettonAmount<Jetton>
  ) {
    const isSorted = PoolWrapper.Pool.isSorted(jetton0.walletAddress!, jetton1.walletAddress!);

    if (!isSorted) {
      return {
        jetton0: jetton1,
        jetton1: jetton0,
        amount0: amount1,
        amount1: amount0
      };
    }

    return {
      jetton0,
      jetton1,
      amount0,
      amount1
    };
  }

  /**
   * Creates mint parameters
   */
  private static createMintParams(
    jettonWallet: Address,
    tickLower: number,
    tickUpper: number,
    fee: number,
    tickSpacing: number,
    liquidity: bigint
  ): MintParams {
    return {
      kind: 'MintParams',
      forward_opcode: PoolWrapper.Opcodes.Mint,
      jetton1_wallet: jettonWallet,
      tick_lower: Number(tickLower),
      tick_upper: Number(tickUpper),
      fee,
      tick_spacing: tickSpacing,
      liquidity_delta: liquidity,
    };
  }

  /**
   * Creates swap parameters
   */
  private static createSwapParams(
    fee: number,
    jettonWallet: Address,
    sqrtPriceLimit: bigint,
    tickSpacing: number,
    zeroForOne: number
  ): SwapParams {
    return {
      kind: 'SwapParams',
      forward_opcode: PoolWrapper.Opcodes.Swap,
      fee,
      jetton1_wallet: jettonWallet,
      sqrt_price_limit: sqrtPriceLimit,
      tick_spacing: tickSpacing,
      zero_for_one: zeroForOne
    };
  }

  /**
   * Creates a jetton message for mint operation
   */
  private static createJettonMessage(
    jetton: Jetton,
    amount: JettonAmount<Jetton>,
    params: MintParams,
    responseAddress: Address,
    routerAddress: string,
    ptonRouterWallet: string,
    value: bigint
  ): SenderArguments {
    const isPTon = jetton.address.equals(Address.parse(ptonRouterWallet));

    if (isPTon) {
      const paramsCell = beginCell();
      storeMintParams(params)(paramsCell);
      
      const msgBuilder = beginCell()
        .storeUint(PTonWalletWrapper.proxyWalletOpcodesV2.tonTransfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount.quotient)
        .storeAddress(responseAddress)
        .storeUint(1, 1)
        .storeRef(paramsCell)
        .endCell();

      return {
        to: amount.jetton.walletAddress!,
        value,
        body: msgBuilder,
      };
    } else {
      const payloadBuilder = beginCell();
      storeOpJettonTransferMint({
        kind: 'OpJettonTransferMint',
        query_id: 0,
        jetton_amount: amount.quotient,
        to_address: Address.parse(routerAddress),
        response_address: responseAddress,
        custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
        forward_ton_amount: toNano(0.15),
        either_payload: true,
        mint: params,
      })(payloadBuilder);
      
      return {
        to: amount.jetton.walletAddress!,
        value,
        body: payloadBuilder.endCell(),
      };
    }
  }

  /**
   * Creates a TON to jetton swap message
   */
  private static createTonToJettonSwapMessage(
    amount: JettonAmount<Jetton>,
    swapParams: SwapParams,
    responseAddress: Address,
    ptonRouterWallet: string
  ): SenderArguments[] {
    const swapCell = beginCell();
    storeSwapParams(swapParams)(swapCell);

    const msgBuilder = beginCell()
      .storeUint(PTonWalletWrapper.proxyWalletOpcodesV2.tonTransfer, 32)
      .storeUint(0, 64)
      .storeCoins(amount.quotient)
      .storeAddress(responseAddress)
      .storeUint(1, 1)
      .storeRef(swapCell)
      .endCell();

    return [
      {
        to: Address.parse(ptonRouterWallet),
        value: this.gasUsage.SWAP_GAS + amount.quotient,
        body: msgBuilder,
      },
    ];
  }

  /**
   * Creates a jetton to jetton swap message
   */
  private static createJettonToJettonSwapMessage(
    amount: JettonAmount<Jetton>,
    swapParams: SwapParams,
    responseAddress: Address,
    routerAddress: Address
  ): SenderArguments[] {
    const jettonPayloadBuilder = beginCell();
    storeOpJettonTransferSwap({
      kind: 'OpJettonTransferSwap',
      query_id: 0,
      jetton_amount: amount.quotient,
      to_address: routerAddress,
      response_address: responseAddress,
      custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
      forward_ton_amount: toNano(0.8),
      either_payload: true,
      swap: swapParams,
    })(jettonPayloadBuilder);

    return [
      {
        to: amount.jetton.walletAddress!,
        value: this.gasUsage.SWAP_GAS,
        body: jettonPayloadBuilder.endCell(),
      },
    ];
  }

  /**
   * Emulates messages using the TON API client
   */
  private static async emulateMessages(
    tonApiClient: TonApiClient,
    walletVersion: WalletVersion,
    senderAddress: Address,
    messages: SenderArguments[],
    workchain: number = 0,
    chain: Chain = Chain.Mainnet,
    customContractAddresses?: ContractAddresses,
  ) {
    // Get account information
    const { seqno } = await tonApiClient.wallet.getAccountSeqno(senderAddress);
    const { publicKey: publicKeyHex } = await tonApiClient.accounts.getAccountPublicKey(senderAddress);
    
    // Create wallet contract
    const wallet = WalletContract.create(
      workchain,
      Buffer.from(publicKeyHex, 'hex'),
      walletVersion,
    );
    
    // Create dummy key for signing
    const dummyKey = (await mnemonicToPrivateKey(await mnemonicNew())).secretKey;
    
    // Create transfer
    const transfer = wallet.createTransfer({
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
            body: transfer,
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
