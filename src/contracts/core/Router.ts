import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from '@ton/core';
import { crc32 } from '../../utils/crc32';
import { OpCreatePool, storeOpCreatePool } from '../../tlbs/router';
import { ValueOps } from '..';

namespace RouterWrapper {
  export const Opcodes = {
    CreatePool: crc32('op::create_pool'),
    SetAdminAddress: crc32('op::set_admin_address'),
    UpdateLockState: crc32('op::update_lock_state'),
    UpdatePoolCode: crc32('op::update_pool_code'),
    UpdateAccountCode: crc32('op::update_account_code'),
    UpdateBatchTickCode: crc32('op::update_batch_tick_code'),
    UpdatePositionCode: crc32('op::update_position_code'),
  };

  export interface InstantiateMsg {
    adminAddress: Address;
    poolCode: Cell;
    positionCode: Cell;
    lpAccountCode: Cell;
  }

  export interface SetAdminAddressMsg {
    address: Address;
  }

  export class Router implements Contract {
    static workchain = 0;

    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static setWorkchain(workchain: number) {
      Router.workchain = workchain;
    }

    static createFromAddress(address: Address) {
      return new Router(address);
    }

    static create(code: Cell, initMsg: InstantiateMsg) {
      const data = beginCell()
        .storeInt(-1, 8)
        .storeUint(0, 64)
        .storeAddress(initMsg.adminAddress)
        .storeRef(
          beginCell()
            .storeRef(initMsg.poolCode)
            .storeRef(initMsg.positionCode)
            .storeRef(initMsg.lpAccountCode),
        )
        .endCell();
      const init = { code, data };
      return new Router(contractAddress(Router.workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell().endCell(),
      });
    }

    async sendCreatePool(
      provider: ContractProvider,
      via: Sender,
      data: OpCreatePool,
      ops: ValueOps,
    ) {
      let cell = beginCell();
      storeOpCreatePool(data)(cell);
      await provider.internal(via, {
        ...ops,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: cell.endCell(),
      });
    }

    async sendSetAdminAddress(
      provider: ContractProvider,
      via: Sender,
      data: SetAdminAddressMsg,
      ops: ValueOps,
    ) {
      await provider.internal(via, {
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        ...ops,
        body: beginCell()
          .storeUint(Opcodes.SetAdminAddress, 32)
          .storeUint(ops.queryId ?? 0, 64)
          .storeAddress(data.address)
          .endCell(),
      });
    }

    async getAdminAddress(provider: ContractProvider): Promise<Address> {
      const result = await provider.get('get_admin_address', []);
      console.log(result);
      return result.stack.readAddress();
    }

    async getIsLocked(provider: ContractProvider): Promise<boolean> {
      const result = await provider.get('get_is_locked', []);
      return result.stack.readBigNumber() === -1n ? true : false;
    }

    async getPoolCode(provider: ContractProvider): Promise<Cell> {
      const result = await provider.get('get_pool_code', []);
      return result.stack.readCell();
    }

    async getBatchTickCode(provider: ContractProvider): Promise<Cell> {
      const result = await provider.get('get_batch_tick_code', []);
      return result.stack.readCell();
    }

    async getPositionCode(provider: ContractProvider): Promise<Cell> {
      const result = await provider.get('get_position_code', []);
      return result.stack.readCell();
    }

    async getLpAccountCode(provider: ContractProvider): Promise<Cell> {
      const result = await provider.get('get_lp_account_code', []);
      return result.stack.readCell();
    }

    async getPoolAddress(
      provider: ContractProvider,
      token0: Address,
      token1: Address,
      fee: bigint,
      tick_spacing: bigint,
    ): Promise<Address> {
      const result = await provider.get('get_pool_address', [
        {
          type: 'slice',
          cell: beginCell().storeAddress(token0).endCell(),
        },
        {
          type: 'slice',
          cell: beginCell().storeAddress(token1).endCell(),
        },
        {
          type: 'int',
          value: fee,
        },
        {
          type: 'int',
          value: tick_spacing,
        },
      ]);
      return result.stack.readAddress();
    }
  }
}

export default RouterWrapper;
