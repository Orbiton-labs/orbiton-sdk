import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  DictionaryKey,
  DictionaryValue,
  Sender,
  SendMode,
} from '@ton/core';
import { crc32 } from '../../utils/crc32';
import { ValueOps } from '..';

namespace BatchTickWrapper {
  export const Opcodes = {
    UpdateTickLower: crc32('op::update_tick_lower'),
    UpdateTickUpper: crc32('op::update_tick_upper'),
  };

  export interface InstantiateMsg {
    batchIndex: bigint;
    tickSpacing: bigint;
    poolAddress: Address;
    batchTickCode: Cell;
  }

  export interface UpdateTickLowerMsg {
    tickLower: bigint;
    tickUpper: bigint;
    currentTick: bigint;
    liquidity: bigint;
    feeGrowthInside0LastX128: bigint;
    feeGrowthInside1LastX128: bigint;
    maxLiquidity: bigint;
  }

  export interface UpdateTickUpperMsg {
    flippedLower: boolean;
    tickUpper: bigint;
    currentTick: bigint;
    liquidity: bigint;
    feeGrowthInside0LastX128: bigint;
    feeGrowthInside1LastX128: bigint;
    maxLiquidity: bigint;
  }

  export class BatchTick implements Contract {
    static workchain = 0;

    static buildUpdateTickLowerPacket(data: UpdateTickLowerMsg) {
      return beginCell()
        .storeUint(BatchTickWrapper.Opcodes.UpdateTickLower, 32)
        .storeUint(0, 64)
        .storeInt(data.tickLower, 24)
        .storeInt(data.tickUpper, 24)
        .storeInt(data.currentTick, 24)
        .storeUint(data.liquidity, 128)
        .storeUint(data.feeGrowthInside0LastX128, 256)
        .storeUint(data.feeGrowthInside1LastX128, 256)
        .storeInt(0, 2)
        .storeUint(data.maxLiquidity, 128)
        .endCell();
    }

    static buildUpdateTickUpperPacket(data: UpdateTickUpperMsg) {
      return beginCell()
        .storeUint(BatchTickWrapper.Opcodes.UpdateTickUpper, 32)
        .storeUint(0, 64)
        .storeInt(data.flippedLower ? -1 : 0, 2)
        .storeInt(data.tickUpper, 24)
        .storeInt(data.currentTick, 24)
        .storeUint(data.liquidity, 128)
        .storeUint(data.feeGrowthInside0LastX128, 256)
        .storeUint(data.feeGrowthInside1LastX128, 256)
        .storeInt(-1, 2)
        .storeUint(data.maxLiquidity, 128)
        .endCell();
    }

    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static setWorkchain(workchain: number) {
      BatchTick.workchain = workchain;
    }

    static createFromAddress(address: Address) {
      return new BatchTick(address);
    }

    static create(code: Cell, initMsg: InstantiateMsg) {
      const data = beginCell()
        .storeInt(initMsg.batchIndex, 16)
        .storeInt(initMsg.tickSpacing, 24)
        .storeAddress(initMsg.poolAddress)
        .storeDict(Dictionary.empty()) // empty dict
        .storeRef(initMsg.batchTickCode)
        .endCell();
      const init = { code, data };
      return new BatchTick(contractAddress(BatchTick.workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell().endCell(),
      });
    }

    async sendUpdateTickLower(
      provider: ContractProvider,
      via: Sender,
      data: UpdateTickLowerMsg,
      opts: ValueOps,
    ) {
      await provider.internal(via, {
        value: opts.value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: BatchTick.buildUpdateTickLowerPacket(data),
      });
    }

    async sendUpdateTickUpper(
      provider: ContractProvider,
      via: Sender,
      data: UpdateTickUpperMsg,
      opts: ValueOps,
    ) {
      await provider.internal(via, {
        value: opts.value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: BatchTick.buildUpdateTickUpperPacket(data),
      });
    }

    async getTick(provider: ContractProvider, tick: bigint) {
      const result = await provider.get('get_tick', [
        {
          type: 'int',
          value: BigInt(tick),
        },
      ]);
      return result.stack.readCell();
    }
  }
}

export default BatchTickWrapper;
