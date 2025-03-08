import { Builder } from '@ton/core';
import { Slice } from '@ton/core';
import { beginCell } from '@ton/core';
import { Cell } from '@ton/core';
import { Address } from '@ton/core';
import { ExternalAddress } from '@ton/core';
export function bitLen(n: number) {
  return n.toString(2).length;
}

/*
mint#_  forward_opcode: uint32
        jetton1_wallet: MsgAddress
        tick_lower: int24
        tick_upper: int24
        fee: uint24
        tick_spacing: int24
        liquidity_delta: int128 = MintParams;
*/

export interface MintParams {
  readonly kind: 'MintParams';
  readonly forward_opcode: number;
  readonly jetton1_wallet: Address | ExternalAddress | null;
  readonly tick_lower: number;
  readonly tick_upper: number;
  readonly fee: number;
  readonly tick_spacing: number;
  readonly liquidity_delta: bigint;
}

/*
op_jetton_transfer_mint#0f8a7ea5
        query_id: uint64
        jetton_amount: Grams
        to_address: MsgAddress
        response_address: MsgAddress
        custom_payload: Cell
        forward_ton_amount: Grams
        either_payload: Bool
        mint: ^MintParams = OpJettonTransferMint;
*/

export interface OpJettonTransferMint {
  readonly kind: 'OpJettonTransferMint';
  readonly query_id: number;
  readonly jetton_amount: bigint;
  readonly to_address: Address | ExternalAddress | null;
  readonly response_address: Address | ExternalAddress | null;
  readonly custom_payload: Cell;
  readonly forward_ton_amount: bigint;
  readonly either_payload: boolean;
  readonly mint: MintParams;
}

/*
swap#_  forward_opcode: uint32
        jetton1_wallet: MsgAddress
        fee: uint24
        tick_spacing: int24
        zero_for_one: int2
        sqrt_price_limit: uint160 = SwapParams;
*/

export interface SwapParams {
  readonly kind: 'SwapParams';
  readonly forward_opcode: number;
  readonly jetton1_wallet: Address | ExternalAddress | null;
  readonly fee: number;
  readonly tick_spacing: number;
  readonly zero_for_one: number;
  readonly sqrt_price_limit: bigint;
}

/*
op_jetton_transfer_swap#0f8a7ea5
        query_id: uint64
        jetton_amount: Grams
        to_address: MsgAddress
        response_address: MsgAddress
        custom_payload: Cell
        forward_ton_amount: Grams
        either_payload: Bool
        swap: ^SwapParams = OpJettonTransferSwap;
*/

export interface OpJettonTransferSwap {
  readonly kind: 'OpJettonTransferSwap';
  readonly query_id: number;
  readonly jetton_amount: bigint;
  readonly to_address: Address | ExternalAddress | null;
  readonly response_address: Address | ExternalAddress | null;
  readonly custom_payload: Cell;
  readonly forward_ton_amount: bigint;
  readonly either_payload: boolean;
  readonly swap: SwapParams;
}

/*
mint#_  forward_opcode: uint32
        jetton1_wallet: MsgAddress
        tick_lower: int24
        tick_upper: int24
        fee: uint24
        tick_spacing: int24
        liquidity_delta: int128 = MintParams;
*/

export function loadMintParams(slice: Slice): MintParams {
  let forward_opcode: number = slice.loadUint(32);
  let jetton1_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
  let tick_lower: number = slice.loadInt(24);
  let tick_upper: number = slice.loadInt(24);
  let fee: number = slice.loadUint(24);
  let tick_spacing: number = slice.loadInt(24);
  let liquidity_delta: bigint = slice.loadIntBig(128);
  return {
    kind: 'MintParams',
    forward_opcode: forward_opcode,
    jetton1_wallet: jetton1_wallet,
    tick_lower: tick_lower,
    tick_upper: tick_upper,
    fee: fee,
    tick_spacing: tick_spacing,
    liquidity_delta: liquidity_delta,
  };
}

export function storeMintParams(mintParams: MintParams): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(mintParams.forward_opcode, 32);
    builder.storeAddress(mintParams.jetton1_wallet);
    builder.storeInt(mintParams.tick_lower, 24);
    builder.storeInt(mintParams.tick_upper, 24);
    builder.storeUint(mintParams.fee, 24);
    builder.storeInt(mintParams.tick_spacing, 24);
    builder.storeInt(mintParams.liquidity_delta, 128);
  };
}

/*
op_jetton_transfer_mint#0f8a7ea5
        query_id: uint64
        jetton_amount: Grams
        to_address: MsgAddress
        response_address: MsgAddress
        custom_payload: Cell
        forward_ton_amount: Grams
        either_payload: Bool
        mint: ^MintParams = OpJettonTransferMint;
*/

export function loadOpJettonTransferMint(slice: Slice): OpJettonTransferMint {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0x0f8a7ea5) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let jetton_amount: bigint = slice.loadCoins();
    let to_address: Address | ExternalAddress | null = slice.loadAddressAny();
    let response_address: Address | ExternalAddress | null = slice.loadAddressAny();
    let custom_payload: Cell = slice.asCell();
    let forward_ton_amount: bigint = slice.loadCoins();
    let either_payload: boolean = slice.loadBoolean();
    let slice1 = slice.loadRef().beginParse(true);
    let mint: MintParams = loadMintParams(slice1);
    return {
      kind: 'OpJettonTransferMint',
      query_id: query_id,
      jetton_amount: jetton_amount,
      to_address: to_address,
      response_address: response_address,
      custom_payload: custom_payload,
      forward_ton_amount: forward_ton_amount,
      either_payload: either_payload,
      mint: mint,
    };
  }
  throw new Error(
    'Expected one of "OpJettonTransferMint" in loading "OpJettonTransferMint", but data does not satisfy any constructor',
  );
}

export function storeOpJettonTransferMint(
  opJettonTransferMint: OpJettonTransferMint,
): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0x0f8a7ea5, 32);
    builder.storeUint(opJettonTransferMint.query_id, 64);
    builder.storeCoins(opJettonTransferMint.jetton_amount);
    builder.storeAddress(opJettonTransferMint.to_address);
    builder.storeAddress(opJettonTransferMint.response_address);
    builder.storeSlice(opJettonTransferMint.custom_payload.beginParse(true));
    builder.storeCoins(opJettonTransferMint.forward_ton_amount);
    builder.storeBit(opJettonTransferMint.either_payload);
    let cell1 = beginCell();
    storeMintParams(opJettonTransferMint.mint)(cell1);
    builder.storeRef(cell1);
  };
}

/*
swap#_  forward_opcode: uint32
        jetton1_wallet: MsgAddress
        fee: uint24
        tick_spacing: int24
        zero_for_one: int2
        sqrt_price_limit: uint160 = SwapParams;
*/

export function loadSwapParams(slice: Slice): SwapParams {
  let forward_opcode: number = slice.loadUint(32);
  let jetton1_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
  let fee: number = slice.loadUint(24);
  let tick_spacing: number = slice.loadInt(24);
  let zero_for_one: number = slice.loadInt(2);
  let sqrt_price_limit: bigint = slice.loadUintBig(160);
  return {
    kind: 'SwapParams',
    forward_opcode: forward_opcode,
    jetton1_wallet: jetton1_wallet,
    fee: fee,
    tick_spacing: tick_spacing,
    zero_for_one: zero_for_one,
    sqrt_price_limit: sqrt_price_limit,
  };
}

export function storeSwapParams(swapParams: SwapParams): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(swapParams.forward_opcode, 32);
    builder.storeAddress(swapParams.jetton1_wallet);
    builder.storeUint(swapParams.fee, 24);
    builder.storeInt(swapParams.tick_spacing, 24);
    builder.storeInt(swapParams.zero_for_one, 2);
    builder.storeUint(swapParams.sqrt_price_limit, 160);
  };
}

/*
op_jetton_transfer_swap#0f8a7ea5
        query_id: uint64
        jetton_amount: Grams
        to_address: MsgAddress
        response_address: MsgAddress
        custom_payload: Cell
        forward_ton_amount: Grams
        either_payload: Bool
        swap: ^SwapParams = OpJettonTransferSwap;
*/

export function loadOpJettonTransferSwap(slice: Slice): OpJettonTransferSwap {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0x0f8a7ea5) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let jetton_amount: bigint = slice.loadCoins();
    let to_address: Address | ExternalAddress | null = slice.loadAddressAny();
    let response_address: Address | ExternalAddress | null = slice.loadAddressAny();
    let custom_payload: Cell = slice.asCell();
    let forward_ton_amount: bigint = slice.loadCoins();
    let either_payload: boolean = slice.loadBoolean();
    let slice1 = slice.loadRef().beginParse(true);
    let swap: SwapParams = loadSwapParams(slice1);
    return {
      kind: 'OpJettonTransferSwap',
      query_id: query_id,
      jetton_amount: jetton_amount,
      to_address: to_address,
      response_address: response_address,
      custom_payload: custom_payload,
      forward_ton_amount: forward_ton_amount,
      either_payload: either_payload,
      swap: swap,
    };
  }
  throw new Error(
    'Expected one of "OpJettonTransferSwap" in loading "OpJettonTransferSwap", but data does not satisfy any constructor',
  );
}

export function storeOpJettonTransferSwap(
  opJettonTransferSwap: OpJettonTransferSwap,
): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0x0f8a7ea5, 32);
    builder.storeUint(opJettonTransferSwap.query_id, 64);
    builder.storeCoins(opJettonTransferSwap.jetton_amount);
    builder.storeAddress(opJettonTransferSwap.to_address);
    builder.storeAddress(opJettonTransferSwap.response_address);
    builder.storeSlice(opJettonTransferSwap.custom_payload.beginParse(true));
    builder.storeCoins(opJettonTransferSwap.forward_ton_amount);
    builder.storeBit(opJettonTransferSwap.either_payload);
    let cell1 = beginCell();
    storeSwapParams(opJettonTransferSwap.swap)(cell1);
    builder.storeRef(cell1);
  };
}
