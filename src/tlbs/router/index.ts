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
jetton_master_ref#_
    jetton0_master: MsgAddress
    jetton1_master: MsgAddress = JettonMasterRef;
*/

export interface JettonMasterRef {
  readonly kind: 'JettonMasterRef';
  readonly jetton0_master: Address | ExternalAddress | null;
  readonly jetton1_master: Address | ExternalAddress | null;
}

/*
op_create_pool#ad85e6b3 
    query_id:uint64
    jetton0_wallet: MsgAddress
    jetton1_wallet: MsgAddress
    fee: uint24
    tick_spacing: int24
    sqrt_price_x96: uint160
    jetton_master_ref: ^JettonMasterRef = OpCreatePool;
*/

export interface OpCreatePool {
  readonly kind: 'OpCreatePool';
  readonly query_id: number;
  readonly jetton0_wallet: Address | ExternalAddress | null;
  readonly jetton1_wallet: Address | ExternalAddress | null;
  readonly fee: number;
  readonly tick_spacing: number;
  readonly sqrt_price_x96: bigint;
  readonly jetton_master_ref: JettonMasterRef;
}

/*
jetton_master_ref#_
    jetton0_master: MsgAddress
    jetton1_master: MsgAddress = JettonMasterRef;
*/

export function loadJettonMasterRef(slice: Slice): JettonMasterRef {
  let jetton0_master: Address | ExternalAddress | null = slice.loadAddressAny();
  let jetton1_master: Address | ExternalAddress | null = slice.loadAddressAny();
  return {
    kind: 'JettonMasterRef',
    jetton0_master: jetton0_master,
    jetton1_master: jetton1_master,
  };
}

export function storeJettonMasterRef(jettonMasterRef: JettonMasterRef): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeAddress(jettonMasterRef.jetton0_master);
    builder.storeAddress(jettonMasterRef.jetton1_master);
  };
}

/*
op_create_pool#ad85e6b3 
    query_id:uint64
    jetton0_wallet: MsgAddress
    jetton1_wallet: MsgAddress
    fee: uint24
    tick_spacing: int24
    sqrt_price_x96: uint160
    jetton_master_ref: ^JettonMasterRef = OpCreatePool;
*/

export function loadOpCreatePool(slice: Slice): OpCreatePool {
  if (slice.remainingBits >= 32 && slice.preloadUint(32) == 0xad85e6b3) {
    slice.loadUint(32);
    let query_id: number = slice.loadUint(64);
    let jetton0_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
    let jetton1_wallet: Address | ExternalAddress | null = slice.loadAddressAny();
    let fee: number = slice.loadUint(24);
    let tick_spacing: number = slice.loadInt(24);
    let sqrt_price_x96: bigint = slice.loadUintBig(160);
    let slice1 = slice.loadRef().beginParse(true);
    let jetton_master_ref: JettonMasterRef = loadJettonMasterRef(slice1);
    return {
      kind: 'OpCreatePool',
      query_id: query_id,
      jetton0_wallet: jetton0_wallet,
      jetton1_wallet: jetton1_wallet,
      fee: fee,
      tick_spacing: tick_spacing,
      sqrt_price_x96: sqrt_price_x96,
      jetton_master_ref: jetton_master_ref,
    };
  }
  throw new Error(
    'Expected one of "OpCreatePool" in loading "OpCreatePool", but data does not satisfy any constructor',
  );
}

export function storeOpCreatePool(opCreatePool: OpCreatePool): (builder: Builder) => void {
  return (builder: Builder) => {
    builder.storeUint(0xad85e6b3, 32);
    builder.storeUint(opCreatePool.query_id, 64);
    builder.storeAddress(opCreatePool.jetton0_wallet);
    builder.storeAddress(opCreatePool.jetton1_wallet);
    builder.storeUint(opCreatePool.fee, 24);
    builder.storeInt(opCreatePool.tick_spacing, 24);
    builder.storeUint(opCreatePool.sqrt_price_x96, 160);
    let cell1 = beginCell();
    storeJettonMasterRef(opCreatePool.jetton_master_ref)(cell1);
    builder.storeRef(cell1);
  };
}
