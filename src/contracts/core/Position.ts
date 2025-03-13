import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';
import { crc32 } from '../../utils/crc32';
import {
  BurnPositionMessage,
  BurnPositionParams,
  CollectMessage,
  CollectParams,
  storeBurnPositionMessage,
  storeCollectMessage,
  loadPositionStorage,
} from '../../tlbs/position';

namespace PositionWrapper {
  export const Opcodes = {
    MintPosition: crc32('op::mint_position'),
    BurnPosition: crc32('op::burn_position'),
    Collect: crc32('op::collect'),
    CallBackPoolBurn: crc32('op::cb_pool_burn'),
  };

  export class Position implements Contract {
    static workchain = 0;

    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static setWorkchain(workchain: number) {
      Position.workchain = workchain;
    }

    static createFromAddress(address: Address) {
      return new Position(address);
    }

    async getStorage(provider: ContractProvider) {
      const storage = await provider.getState();
      if (storage.state.type === 'active') {
        return loadPositionStorage(
          Cell.fromBoc(Buffer.from(storage.state.data ?? Buffer.from([])))[0].beginParse(),
        );
      }
      throw new Error('Position is not active');
    }

    async getOwnerAddress(provider: ContractProvider) {
      const storage = await this.getStorage(provider);
      return storage.second_ref.owner_address;
    }

    async getTokensOwed(provider: ContractProvider) {
      const storage = await this.getStorage(provider);
      return {
        tokenOwed0: storage.second_ref.token_owed0,
        tokenOwed1: storage.second_ref.token_owed1,
      };
    }

    async sendBurnPosition(
      provider: ContractProvider,
      via: Sender,
      value: bigint,
      liquidityDelta: bigint,
    ) {
      const burnParams: BurnPositionParams = {
        kind: 'BurnPositionParams',
        liquidity_delta: liquidityDelta,
      };

      const message: BurnPositionMessage = {
        kind: 'BurnPositionMessage',
        query_id: 0,
        body: burnParams,
      };

      const body = beginCell();
      storeBurnPositionMessage(message)(body);

      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: body.endCell(),
      });
    }

    async sendCollect(
      provider: ContractProvider,
      via: Sender,
      value: bigint,
      recipient: Address,
      amount0Requested: bigint,
      amount1Requested: bigint,
    ) {
      const collectParams: CollectParams = {
        kind: 'CollectParams',
        recipient: recipient,
        amount_0_requested: amount0Requested,
        amount_1_requested: amount1Requested,
      };

      const message: CollectMessage = {
        kind: 'CollectMessage',
        query_id: 0,
        body: collectParams,
      };

      const body = beginCell();
      storeCollectMessage(message)(body);

      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: body.endCell(),
      });
    }
  }
}

export default PositionWrapper;
