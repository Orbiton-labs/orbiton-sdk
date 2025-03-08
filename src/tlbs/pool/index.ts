import { Builder } from '@ton/core';
import { Slice } from '@ton/core';
import { beginCell } from '@ton/core';
import { BitString } from '@ton/core';
import { Cell } from '@ton/core';
import { Address } from '@ton/core';
import { ExternalAddress } from '@ton/core';
import { Dictionary } from '@ton/core';
import { DictionaryValue } from '@ton/core';
export function bitLen(n: number) {
  return n.toString(2).length;
}

/*
mint#_  jetton_amount_0:Grams 
        jetton_amount_1:Grams 
        tick_lower:int24 
        tick_upper:int24 
        liquidity_delta:int128 
        recipient:MsgAddress = MintParams;
*/

export interface MintParams {
  readonly kind: 'MintParams';
  readonly jetton_amount_0: bigint;
  readonly jetton_amount_1: bigint;
  readonly tick_lower: number;
  readonly tick_upper: number;
  readonly liquidity_delta: bigint;
  readonly recipient: Address | ExternalAddress | null;
}

/*
op_mint#ecad15c4 
    query_id:uint64
    body: ^MintParams = InMsgBody;
*/

export interface InMsgBody {
  readonly kind: 'InMsgBody';
  readonly query_id: number;
  readonly body: MintParams;
}

/*
mint#_  jetton_amount_0:Grams 
        jetton_amount_1:Grams 
        tick_lower:int24 
        tick_upper:int24 
        liquidity_delta:int128 
        recipient:MsgAddress = MintParams;
*/

export function loadMintParams(slice: Slice): MintParams {
  let jetton_amount_0: bigint = slice.loadCoins();
  let jetton_amount_1: bigint = slice.loadCoins();
  let tick_lower: number = slice.loadInt(24);
  let tick_upper: number = slice.loadInt(24);
  let liquidity_delta: bigint = slice.loadIntBig(128);
  let recipient: Address | ExternalAddress | null = slice.loadAddressAny();
  return {
    kind: 'MintParams',
    jetton_amount_0: jetton_amount_0,
    jetton_amount_1: jetton_amount_1,
    tick_lower: tick_lower,
    tick_upper: tick_upper,
    liquidity_delta: liquidity_delta,
    recipient: recipient,
  };
}

export function storeMintParams(mintParams: MintParams): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeCoins(mintParams.jetton_amount_0);
    builder.storeCoins(mintParams.jetton_amount_1);
    builder.storeInt(mintParams.tick_lower, 24);
    builder.storeInt(mintParams.tick_upper, 24);
    builder.storeInt(mintParams.liquidity_delta, 128);
    builder.storeAddress(mintParams.recipient);
  };
}

/*
op_mint#ecad15c4 
    query_id:uint64
    body: ^MintParams = InMsgBody;
*/

export function loadInMsgBody(slice: Slice): InMsgBody {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0xecad15c4) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let slice1 = slice.loadRef().beginParse(true);
    let body: MintParams = loadMintParams(slice1);
    return {
      kind: 'InMsgBody',
      query_id: query_id,
      body: body,
    };
  }
  throw new Error(
    'Expected one of "InMsgBody" in loading "InMsgBody", but data does not satisfy any constructor',
  );
}

export function storeInMsgBody(inMsgBody: InMsgBody): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0xecad15c4, 32);
    builder.storeUint(inMsgBody.query_id, 64);
    let cell1 = beginCell();
    storeMintParams(inMsgBody.body)(cell1);
    builder.storeRef(cell1);
  };
}

/*
pool#_
  first_ref:^PoolFirst
  second_ref:^PoolSecond
  third_ref:^PoolThird
  = PoolStorage;
*/

export interface PoolStorage {
  readonly kind: 'PoolStorage';
  readonly first_ref: PoolFirst;
  readonly second_ref: PoolSecond;
  readonly third_ref: PoolThird;
}

/*
pool_first#_
  router_address:MsgAddress
  jetton0_wallet:MsgAddress
  jetton1_wallet:MsgAddress
  fee:uint24
  protocol_fee:uint8
  sqrt_price_x96:uint160
  = PoolFirst;
*/

export interface PoolFirst {
  readonly kind: 'PoolFirst';
  readonly router_address: Address | ExternalAddress | null;
  readonly jetton0_wallet: Address | ExternalAddress | null;
  readonly jetton1_wallet: Address | ExternalAddress | null;
  readonly fee: number;
  readonly protocol_fee: number;
  readonly sqrt_price_x96: bigint;
}

/*
pool_second#_
  tick_spacing:int24
  tick:int24
  fee_growth_global_0x128:uint256
  fee_growth_global_1x128:uint256
  collected_protocol_fee0:uint128
  collected_protocol_fee1:uint128
  liquidity:uint128
  = PoolSecond;
*/

export interface PoolSecond {
  readonly kind: 'PoolSecond';
  readonly tick_spacing: number;
  readonly tick: number;
  readonly fee_growth_global_0x128: bigint;
  readonly fee_growth_global_1x128: bigint;
  readonly collected_protocol_fee0: bigint;
  readonly collected_protocol_fee1: bigint;
  readonly liquidity: bigint;
}

/*
tick#_ 
  liquidity_gross:uint128 
  liquidity_net:int128 
  fee_growth_outside_0_x128:uint256 
  fee_growth_outside_1_x128:uint256 
  tick_cumulative_outside:int56 
  initialized:Bool = TickInfo;
*/

export interface TickInfo {
  readonly kind: 'TickInfo';
  readonly liquidity_gross: bigint;
  readonly liquidity_net: bigint;
  readonly fee_growth_outside_0_x128: bigint;
  readonly fee_growth_outside_1_x128: bigint;
  readonly tick_cumulative_outside: number;
  readonly initialized: boolean;
}

/*
pool_third#_
  max_liquidity_per_tick:uint128
  ticks:^(HashmapE 32 TickInfo)
  position_code:^Cell
  lp_account_code:^Cell
  = PoolThird;
*/

export interface PoolThird {
  readonly kind: 'PoolThird';
  readonly max_liquidity_per_tick: bigint;
  readonly ticks: Dictionary<number, TickInfo>;
  readonly position_code: Cell;
  readonly lp_account_code: Cell;
}

/*
pool#_
  first_ref:^PoolFirst
  second_ref:^PoolSecond
  third_ref:^PoolThird
  = PoolStorage;
*/

export function loadPoolStorage(slice: Slice): PoolStorage {
  let slice1 = slice.loadRef().beginParse(true);
  let first_ref: PoolFirst = loadPoolFirst(slice1);
  let slice2 = slice.loadRef().beginParse(true);
  let second_ref: PoolSecond = loadPoolSecond(slice2);
  let slice3 = slice.loadRef().beginParse(true);
  let third_ref: PoolThird = loadPoolThird(slice3);
  return {
    kind: 'PoolStorage',
    first_ref: first_ref,
    second_ref: second_ref,
    third_ref: third_ref,
  };
}

export function storePoolStorage(poolStorage: PoolStorage): (builder: Builder) => void {
  return (builder: Builder) => {
    let cell1 = beginCell();
    storePoolFirst(poolStorage.first_ref)(cell1);
    builder.storeRef(cell1);
    let cell2 = beginCell();
    storePoolSecond(poolStorage.second_ref)(cell2);
    builder.storeRef(cell2);
    let cell3 = beginCell();
    storePoolThird(poolStorage.third_ref)(cell3);
    builder.storeRef(cell3);
  };
}

/*
pool_first#_
  router_address:MsgAddress
  jetton0_wallet:MsgAddress
  jetton1_wallet:MsgAddress
  fee:uint24
  protocol_fee:uint8
  sqrt_price_x96:uint160
  = PoolFirst;
*/

export function loadPoolFirst(slice: Slice): PoolFirst {
  let router_address: Address | ExternalAddress | null = slice.loadAddressAny();
  let jetton0_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
  let jetton1_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
  let fee: number = slice.loadUint(24);
  let protocol_fee: number = slice.loadUint(8);
  let sqrt_price_x96: bigint = slice.loadUintBig(160);
  return {
    kind: 'PoolFirst',
    router_address: router_address,
    jetton0_wallet: jetton0_wallet,
    jetton1_wallet: jetton1_wallet,
    fee: fee,
    protocol_fee: protocol_fee,
    sqrt_price_x96: sqrt_price_x96,
  };
}

export function storePoolFirst(poolFirst: PoolFirst): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeAddress(poolFirst.router_address);
    builder.storeAddress(poolFirst.jetton0_wallet);
    builder.storeAddress(poolFirst.jetton1_wallet);
    builder.storeUint(poolFirst.fee, 24);
    builder.storeUint(poolFirst.protocol_fee, 8);
    builder.storeUint(poolFirst.sqrt_price_x96, 160);
  };
}

/*
pool_second#_
  tick_spacing:int24
  tick:int24
  fee_growth_global_0x128:uint256
  fee_growth_global_1x128:uint256
  collected_protocol_fee0:uint128
  collected_protocol_fee1:uint128
  liquidity:uint128
  = PoolSecond;
*/

export function loadPoolSecond(slice: Slice): PoolSecond {
  let tick_spacing: number = slice.loadInt(24);
  let tick: number = slice.loadInt(24);
  let fee_growth_global_0x128: bigint = slice.loadUintBig(256);
  let fee_growth_global_1x128: bigint = slice.loadUintBig(256);
  let collected_protocol_fee0: bigint = slice.loadUintBig(128);
  let collected_protocol_fee1: bigint = slice.loadUintBig(128);
  let liquidity: bigint = slice.loadUintBig(128);
  return {
    kind: 'PoolSecond',
    tick_spacing: tick_spacing,
    tick: tick,
    fee_growth_global_0x128: fee_growth_global_0x128,
    fee_growth_global_1x128: fee_growth_global_1x128,
    collected_protocol_fee0: collected_protocol_fee0,
    collected_protocol_fee1: collected_protocol_fee1,
    liquidity: liquidity,
  };
}

export function storePoolSecond(poolSecond: PoolSecond): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeInt(poolSecond.tick_spacing, 24);
    builder.storeInt(poolSecond.tick, 24);
    builder.storeUint(poolSecond.fee_growth_global_0x128, 256);
    builder.storeUint(poolSecond.fee_growth_global_1x128, 256);
    builder.storeUint(poolSecond.collected_protocol_fee0, 128);
    builder.storeUint(poolSecond.collected_protocol_fee1, 128);
    builder.storeUint(poolSecond.liquidity, 128);
  };
}

/*
tick#_ 
  liquidity_gross:uint128 
  liquidity_net:int128 
  fee_growth_outside_0_x128:uint256 
  fee_growth_outside_1_x128:uint256 
  tick_cumulative_outside:int56 
  initialized:Bool = TickInfo;
*/

export function loadTickInfo(slice: Slice): TickInfo {
  let liquidity_gross: bigint = slice.loadUintBig(128);
  let liquidity_net: bigint = slice.loadIntBig(128);
  let fee_growth_outside_0_x128: bigint = slice.loadUintBig(256);
  let fee_growth_outside_1_x128: bigint = slice.loadUintBig(256);
  let tick_cumulative_outside: number = slice.loadInt(56);
  let initialized: boolean = slice.loadBoolean();
  return {
    kind: 'TickInfo',
    liquidity_gross: liquidity_gross,
    liquidity_net: liquidity_net,
    fee_growth_outside_0_x128: fee_growth_outside_0_x128,
    fee_growth_outside_1_x128: fee_growth_outside_1_x128,
    tick_cumulative_outside: tick_cumulative_outside,
    initialized: initialized,
  };
}

export function storeTickInfo(tickInfo: TickInfo): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(tickInfo.liquidity_gross, 128);
    builder.storeInt(tickInfo.liquidity_net, 128);
    builder.storeUint(tickInfo.fee_growth_outside_0_x128, 256);
    builder.storeUint(tickInfo.fee_growth_outside_1_x128, 256);
    builder.storeInt(tickInfo.tick_cumulative_outside, 56);
    builder.storeBit(tickInfo.initialized);
  };
}

/*
pool_third#_
  max_liquidity_per_tick:uint128
  ticks:^(HashmapE 32 TickInfo)
  position_code:^Cell
  lp_account_code:^Cell
  = PoolThird;
*/

export function loadPoolThird(slice: Slice): PoolThird {
  let max_liquidity_per_tick: bigint = slice.loadUintBig(128);
  let slice1 = slice.loadRef().beginParse(true);
  let ticks: Dictionary<number, TickInfo> = Dictionary.load(
    Dictionary.Keys.Uint(32),
    {
      serialize: () => {
        throw new Error('Not implemented');
      },
      parse: loadTickInfo,
    },
    slice1,
  );
  let slice2 = slice.loadRef().beginParse(true);
  let position_code: Cell = slice2.asCell();
  let slice3 = slice.loadRef().beginParse(true);
  let lp_account_code: Cell = slice3.asCell();
  return {
    kind: 'PoolThird',
    max_liquidity_per_tick: max_liquidity_per_tick,
    ticks: ticks,
    position_code: position_code,
    lp_account_code: lp_account_code,
  };
}

export function storePoolThird(poolThird: PoolThird): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(poolThird.max_liquidity_per_tick, 128);
    let cell1 = beginCell();
    cell1.storeDict(poolThird.ticks, Dictionary.Keys.Uint(32), {
      serialize: (arg: TickInfo, builder: Builder) => {
        storeTickInfo(arg)(builder);
      },
      parse: () => {
        throw new Error('Not implemented');
      },
    });
    builder.storeRef(cell1);
    let cell2 = beginCell();
    cell2.storeSlice(poolThird.position_code.beginParse(true));
    builder.storeRef(cell2);
    let cell3 = beginCell();
    cell3.storeSlice(poolThird.lp_account_code.beginParse(true));
    builder.storeRef(cell3);
  };
}
