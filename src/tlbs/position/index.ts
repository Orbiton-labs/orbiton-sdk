import { Builder } from '@ton/core';
import { Slice } from '@ton/core';
import { beginCell } from '@ton/core';
import { Address } from '@ton/core';
import { ExternalAddress } from '@ton/core';
export function bitLen(n: number) {
  return n.toString(2).length;
}

/*
position#_
  first_ref:^PositionFirst
  second_ref:^PositionSecond
  = PositionStorage;
*/
export interface PositionStorage {
  readonly kind: 'PositionStorage';
  readonly first_ref: PositionFirst;
  readonly second_ref: PositionSecond;
}

/*
position_first#_
  tick_lower:int24
  tick_upper:int24
  liquidity:uint128
  fee_growth_inside0_last_x128:uint256
  fee_growth_inside1_last_x128:uint256
  = PositionFirst;
*/
export interface PositionFirst {
  readonly kind: 'PositionFirst';
  readonly tick_lower: number;
  readonly tick_upper: number;
  readonly liquidity: bigint;
  readonly fee_growth_inside0_last_x128: bigint;
  readonly fee_growth_inside1_last_x128: bigint;
}

/*
position_second#_
  token_owed0:uint128
  token_owed1:uint128
  owner_address:MsgAddress
  pool_address:MsgAddress
  = PositionSecond;
*/
export interface PositionSecond {
  readonly kind: 'PositionSecond';
  readonly token_owed0: bigint;
  readonly token_owed1: bigint;
  readonly owner_address: Address | ExternalAddress | null;
  readonly pool_address: Address | ExternalAddress | null;
}

/*
position#_
  first_ref:^PositionFirst
  second_ref:^PositionSecond
  = PositionStorage;
*/
export function loadPositionStorage(slice: Slice): PositionStorage {
  let slice1 = slice.loadRef().beginParse(true);
  let first_ref: PositionFirst = loadPositionFirst(slice1);
  let slice2 = slice.loadRef().beginParse(true);
  let second_ref: PositionSecond = loadPositionSecond(slice2);
  return {
    kind: 'PositionStorage',
    first_ref: first_ref,
    second_ref: second_ref,
  };
}

export function storePositionStorage(positionStorage: PositionStorage): (builder: Builder) => void {
  return (builder: Builder) => {
    let cell1 = beginCell();
    storePositionFirst(positionStorage.first_ref)(cell1);
    builder.storeRef(cell1);
    let cell2 = beginCell();
    storePositionSecond(positionStorage.second_ref)(cell2);
    builder.storeRef(cell2);
  };
}

/*
position_first#_
  tick_lower:int24
  tick_upper:int24
  liquidity:uint128
  fee_growth_inside0_last_x128:uint256
  fee_growth_inside1_last_x128:uint256
  = PositionFirst;
*/
export function loadPositionFirst(slice: Slice): PositionFirst {
  let tick_lower: number = slice.loadInt(24);
  let tick_upper: number = slice.loadInt(24);
  let liquidity: bigint = slice.loadUintBig(128);
  let fee_growth_inside0_last_x128: bigint = slice.loadUintBig(256);
  let fee_growth_inside1_last_x128: bigint = slice.loadUintBig(256);
  return {
    kind: 'PositionFirst',
    tick_lower: tick_lower,
    tick_upper: tick_upper,
    liquidity: liquidity,
    fee_growth_inside0_last_x128: fee_growth_inside0_last_x128,
    fee_growth_inside1_last_x128: fee_growth_inside1_last_x128,
  };
}

export function storePositionFirst(positionFirst: PositionFirst): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeInt(positionFirst.tick_lower, 24);
    builder.storeInt(positionFirst.tick_upper, 24);
    builder.storeUint(positionFirst.liquidity, 128);
    builder.storeUint(positionFirst.fee_growth_inside0_last_x128, 256);
    builder.storeUint(positionFirst.fee_growth_inside1_last_x128, 256);
  };
}

/*
position_second#_
  token_owed0:uint128
  token_owed1:uint128
  owner_address:MsgAddress
  pool_address:MsgAddress
  = PositionSecond;
*/
export function loadPositionSecond(slice: Slice): PositionSecond {
  let token_owed0: bigint = slice.loadUintBig(128);
  let token_owed1: bigint = slice.loadUintBig(128);
  let owner_address: Address | ExternalAddress | null = slice.loadAddressAny();
  let pool_address: Address | ExternalAddress | null = slice.loadAddressAny();
  return {
    kind: 'PositionSecond',
    token_owed0: token_owed0,
    token_owed1: token_owed1,
    owner_address: owner_address,
    pool_address: pool_address,
  };
}

export function storePositionSecond(positionSecond: PositionSecond): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(positionSecond.token_owed0, 128);
    builder.storeUint(positionSecond.token_owed1, 128);
    builder.storeAddress(positionSecond.owner_address);
    builder.storeAddress(positionSecond.pool_address);
  };
}

/*
burn_position#_
  liquidity_delta:uint128
  = BurnPositionParams;
*/
export interface BurnPositionParams {
  readonly kind: 'BurnPositionParams';
  readonly liquidity_delta: bigint;
}

/*
op_burn_position#446497ac
  query_id:uint64
  body: BurnPositionParams
  = BurnPositionMessage;
*/
export interface BurnPositionMessage {
  readonly kind: 'BurnPositionMessage';
  readonly query_id: number;
  readonly body: BurnPositionParams;
}

/*
collect#_
  recipient:MsgAddress
  amount_0_requested:uint128
  amount_1_requested:uint128
  = CollectParams;
*/
export interface CollectParams {
  readonly kind: 'CollectParams';
  readonly recipient: Address | ExternalAddress | null;
  readonly amount_0_requested: bigint;
  readonly amount_1_requested: bigint;
}

/*
op_collect#c89aeef9
  query_id:uint64
  body: CollectParams
  = CollectMessage;
*/
export interface CollectMessage {
  readonly kind: 'CollectMessage';
  readonly query_id: number;
  readonly body: CollectParams;
}

/*
burn_position#_
  liquidity_delta:uint128
  = BurnPositionParams;
*/
export function loadBurnPositionParams(slice: Slice): BurnPositionParams {
  let liquidity_delta: bigint = slice.loadUintBig(128);
  return {
    kind: 'BurnPositionParams',
    liquidity_delta: liquidity_delta,
  };
}

export function storeBurnPositionParams(
  burnPositionParams: BurnPositionParams,
): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(burnPositionParams.liquidity_delta, 128);
  };
}

/*
op_burn_position#446497ac
  query_id:uint64
  body: BurnPositionParams
  = BurnPositionMessage;
*/
export function loadBurnPositionMessage(slice: Slice): BurnPositionMessage {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0x446497ac) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let body: BurnPositionParams = loadBurnPositionParams(slice);
    return {
      kind: 'BurnPositionMessage',
      query_id: query_id,
      body: body,
    };
  }
  throw new Error(
    'Expected one of "BurnPositionMessage" in loading "BurnPositionMessage", but data does not satisfy any constructor',
  );
}

export function storeBurnPositionMessage(
  burnPositionMessage: BurnPositionMessage,
): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0x446497ac, 32);
    builder.storeUint(burnPositionMessage.query_id, 64);
    storeBurnPositionParams(burnPositionMessage.body)(builder);
  };
}

/*
collect#_
  recipient:MsgAddress
  amount_0_requested:uint128
  amount_1_requested:uint128
  = CollectParams;
*/
export function loadCollectParams(slice: Slice): CollectParams {
  let recipient: Address | ExternalAddress | null = slice.loadAddressAny();
  let amount_0_requested: bigint = slice.loadUintBig(128);
  let amount_1_requested: bigint = slice.loadUintBig(128);
  return {
    kind: 'CollectParams',
    recipient: recipient,
    amount_0_requested: amount_0_requested,
    amount_1_requested: amount_1_requested,
  };
}

export function storeCollectParams(collectParams: CollectParams): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeAddress(collectParams.recipient);
    builder.storeUint(collectParams.amount_0_requested, 128);
    builder.storeUint(collectParams.amount_1_requested, 128);
  };
}

/*
op_collect#c89aeef9
  query_id:uint64
  body: CollectParams
  = CollectMessage;
*/
export function loadCollectMessage(slice: Slice): CollectMessage {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0xc89aeef9) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let body: CollectParams = loadCollectParams(slice);
    return {
      kind: 'CollectMessage',
      query_id: query_id,
      body: body,
    };
  }
  throw new Error(
    'Expected one of "CollectMessage" in loading "CollectMessage", but data does not satisfy any constructor',
  );
}

export function storeCollectMessage(collectMessage: CollectMessage): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0xc89aeef9, 32);
    builder.storeUint(collectMessage.query_id, 64);
    storeCollectParams(collectMessage.body)(builder);
  };
}
