import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
} from '@ton/core';
import { crc32 } from '../../utils/crc32';
import {
  InMsgBody,
  loadPoolStorage,
  loadTickInfo,
  PoolStorage,
  storeInMsgBody,
  TickInfo,
} from '../../tlbs/pool';

namespace PoolWrapper {
  export const Opcodes = {
    Mint: crc32('op::mint'),
    Swap: crc32('op::swap'),
    Burn: crc32('op::burn'),

    CallBackLiquidity: crc32('op::cb_add_liquidity'),
    CallbackCollect: crc32('op::cb_collect'),
  };

  export interface InstantiateMsg {
    routerAddress: Address;
    jetton0Wallet: Address;
    jetton1Wallet: Address;
    fee: bigint;
    protocolFee: bigint;
    sqrtPriceX96: bigint;
    tickSpacing: bigint;
    tick: bigint;
    positionCode: Cell;
    lpAccountCode: Cell;
    maxLiquidity?: bigint;
  }

  export class Pool implements Contract {
    static workchain = 0;

    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static isSorted(jetton0: Address, jetton1: Address) {
      return (
        BigInt(`0x${beginCell().storeAddress(jetton0).endCell().hash().toString('hex')}`) <
        BigInt(`0x${beginCell().storeAddress(jetton1).endCell().hash().toString('hex')}`)
      );
    }

    static setWorkchain(workchain: number) {
      Pool.workchain = workchain;
    }

    static createFromAddress(address: Address) {
      return new Pool(address);
    }

    static create(code: Cell, initMsg: InstantiateMsg) {
      const data = beginCell()
        .storeRef(
          beginCell()
            .storeAddress(initMsg.routerAddress)
            .storeAddress(initMsg.jetton0Wallet)
            .storeAddress(initMsg.jetton1Wallet)
            .storeUint(initMsg.fee, 24)
            .storeUint(initMsg.protocolFee, 8)
            .storeUint(initMsg.sqrtPriceX96, 160)
            .endCell(),
        )
        .storeRef(
          beginCell()
            .storeInt(initMsg.tickSpacing, 24)
            .storeInt(0n, 24)
            .storeUint(0n, 256)
            .storeUint(0n, 256)
            .storeUint(0n, 128)
            .storeUint(0n, 128)
            .storeUint(0n, 128)
            .endCell(),
        )
        .storeRef(
          beginCell()
            .storeUint(initMsg.maxLiquidity ?? 0, 128)
            .storeDict(Dictionary.empty())
            .storeRef(initMsg.positionCode)
            .storeRef(initMsg.lpAccountCode)
            .endCell(),
        )
        .endCell();
      const init = { code, data };
      return new Pool(contractAddress(Pool.workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell().endCell(),
      });
    }

    async sendMint(provider: ContractProvider, via: Sender, value: bigint, inMsgBody: InMsgBody) {
      const body = beginCell();
      storeInMsgBody(inMsgBody)(body);
      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: body.endCell(),
      });
    }

    async getTicks(provider: ContractProvider): Promise<[number, TickInfo][]> {
      const poolState = await this.getPoolState(provider);
      const ticks = poolState.third_ref.ticks;
      const allParsedTicksAndTick: [number, TickInfo][] = [];
      ticks.keys().forEach((key: any) => {
        const tick = ticks.get(key);
        if (tick) {
          allParsedTicksAndTick.push([key, tick]);
        }
      });
      return allParsedTicksAndTick;
    }

    async getPoolState(provider: ContractProvider): Promise<PoolStorage> {
      const storage = await provider.getState();
      if (storage.state.type === 'active') {
        return loadPoolStorage(
          Cell.fromBoc(Buffer.from(storage.state.data ?? Buffer.from([])))[0].beginParse(),
        );
      }
      throw new Error('Position is not active');
    }

    async getSimulateSwap(
      provider: ContractProvider,
      amountSpecified: bigint,
      zeroForOne: bigint,
      sqrtPriceLimitX96: bigint,
      responseAddress: Address,
    ): Promise<{
      amount0: bigint;
      amount1: bigint;
      sqrtPriceX96: bigint;
      liquidity: bigint;
      tick: bigint;
      protocolFees0: bigint;
      protocolFees1: bigint;
    }> {
      const result = await provider.get('simulate_swap', [
        {
          type: 'int',
          value: amountSpecified,
        },
        {
          type: 'int',
          value: zeroForOne,
        },
        {
          type: 'int',
          value: sqrtPriceLimitX96,
        },
        {
          type: 'slice',
          cell: beginCell().storeAddress(responseAddress).endCell(),
        },
      ]);
      const tuple = result.stack;
      const amount0 = tuple.readBigNumber();
      const amount1 = tuple.readBigNumber();
      const sqrtPriceX96 = tuple.readBigNumber();
      const liquidity = tuple.readBigNumber();
      const tick = tuple.readBigNumber();
      const protocolFees0 = tuple.readBigNumber();
      const protocolFees1 = tuple.readBigNumber();
      return {
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick,
        protocolFees0,
        protocolFees1,
      };
    }

    async getJettonsWallet(provider: ContractProvider): Promise<Address[]> {
      const result = await provider.get('get_jettons_wallet', []);
      const tuple = result.stack;
      let data: any[] = [];
      while (tuple.remaining > 0) {
        const item = tuple.pop();
        if (item.type === 'cell') {
          data = [...data, item.cell.beginParse().loadAddress()];
        }
      }
      return data;
    }

    async getCollectedFees(provider: ContractProvider): Promise<bigint[]> {
      const result = await provider.get('get_collected_fees', []);
      const tuple = result.stack;
      let data: any[] = [];
      while (tuple.remaining > 0) {
        const item = tuple.pop();
        if (item.type === 'int') {
          data = [...data, item.value];
        }
      }
      return data;
    }

    async getFeesGrowthGlobal(provider: ContractProvider): Promise<bigint[]> {
      const result = await provider.get('get_fee_growth_global', []);
      const tuple = result.stack;
      const feeGrowth0Global = tuple.readBigNumber();
      const feeGrowth1Global = tuple.readBigNumber();
      return [feeGrowth0Global, feeGrowth1Global];
    }

    async getFeesGrowthOutsideAtTick(
      provider: ContractProvider,
      tickId: bigint,
    ): Promise<[bigint, bigint, boolean]> {
      const result = await provider.get('get_fee_growth_outside_at_tick', [
        {
          type: 'int',
          value: tickId,
        },
      ]);
      const tuple = result.stack;
      const feeGrowth0Global = tuple.readBigNumber();
      const feeGrowth1Global = tuple.readBigNumber();
      const existed = tuple.readBoolean();
      return [feeGrowth0Global, feeGrowth1Global, existed];
    }

    async getLpAccountAddress(
      provider: ContractProvider,
      user: Address,
      tick_lower: bigint,
      tick_upper: bigint,
    ): Promise<Address> {
      const result = await provider.get('get_lp_account_address', [
        {
          type: 'slice',
          cell: beginCell().storeAddress(user).endCell(),
        },
        {
          type: 'int',
          value: tick_lower,
        },
        {
          type: 'int',
          value: tick_upper,
        },
      ]);

      return result.stack.readAddress();
    }

    async getPositionAddress(
      provider: ContractProvider,
      tick_lower: bigint,
      tick_upper: bigint,
      owner: Address,
    ): Promise<Address> {
      const result = await provider.get('get_calculate_position_address', [
        {
          type: 'int',
          value: tick_lower,
        },
        {
          type: 'int',
          value: tick_upper,
        },
        {
          type: 'slice',
          cell: beginCell().storeAddress(owner).endCell(),
        },
      ]);
      return result.stack.readAddress();
    }

    async getPoolInfo(provider: ContractProvider) {
      const result = await provider.get('get_pool_info', []);
      const fee = result.stack.readBigNumber();
      const tickSpacing = result.stack.readBigNumber();
      const tick = result.stack.readBigNumber();
      const sqrtPriceX96 = result.stack.readBigNumber();
      const liquidity = result.stack.readBigNumber();
      return { fee, tickSpacing, tick, sqrtPriceX96, liquidity };
    }

    async getFeeGrowthGlobal(provider: ContractProvider) {
      const result = await provider.get('get_fee_growth_global', []);
      const feeGrowthGlobal0X128 = result.stack.readBigNumber();
      const feeGrowthGlobal1X128 = result.stack.readBigNumber();

      return { feeGrowthGlobal0X128, feeGrowthGlobal1X128 };
    }

    async getTickInfo(provider: ContractProvider, tick: bigint): Promise<TickInfo> {
      const result = await provider.get('get_tick_info_raw', [
        {
          type: 'int',
          value: tick,
        },
      ]);
      const infoRaw = result.stack.readCellOpt();
      if (!infoRaw) {
        return {
          kind: 'TickInfo',
          liquidity_gross: 0n,
          liquidity_net: 0n,
          fee_growth_outside_0_x128: 0n,
          fee_growth_outside_1_x128: 0n,
          initialized: false,
        };
      }
      return loadTickInfo(infoRaw.beginParse());
    }
  }
}

export default PoolWrapper;
