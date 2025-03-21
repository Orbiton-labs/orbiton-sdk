import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';
import { TupleItemSlice } from '@ton/core';
import { ValueOps } from '..';
import { JETTON_MINTER_BOC, JETTON_WALLET_BOC } from '../../constants';

namespace JettonMinterWrapper {
  export abstract class JettonMinterOpCodes {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;

    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;
    static mint = 0x15;
    static change_admin = 3;
    static change_content = 4;
  }

  export type JettonMinterConfig = {
    adminAddress: Address;
    content: Cell;
  };

  export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
    const jettonWalletCode = Cell.fromBoc(Buffer.from(JETTON_WALLET_BOC, 'hex'))[0];
    return beginCell()
      .storeCoins(0)
      .storeAddress(config.adminAddress)
      .storeRef(config.content)
      .storeRef(jettonWalletCode)
      .endCell();
  }

  export interface MintJettonInterface {
    toAddress: Address;
    jettonAmount: bigint;
    amount: bigint;
  }

  export class JettonMinter implements Contract {
    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
      return new JettonMinter(address);
    }

    static createFromConfig(config: JettonMinterConfig, workchain = 0) {
      const code = Cell.fromBoc(Buffer.from(JETTON_MINTER_BOC, 'hex'))[0];
      const data = jettonMinterConfigToCell(config);
      const init = { code, data };
      return new JettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, ops: ValueOps) {
      await provider.internal(via, {
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        ...ops,
        body: beginCell().endCell(),
      });
    }

    async sendMint(
      provider: ContractProvider,
      via: Sender,
      data: MintJettonInterface,
      opts: ValueOps,
    ) {
      await provider.internal(via, {
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        value: opts.value,
        body: beginCell()
          .storeUint(JettonMinterOpCodes.mint, 32)
          .storeUint(opts.queryId || 0, 64)
          .storeAddress(data.toAddress)
          .storeCoins(data.amount)
          .storeRef(
            beginCell()
              .storeUint(JettonMinterOpCodes.internal_transfer, 32)
              .storeUint(opts.queryId || 0, 64)
              .storeCoins(data.jettonAmount)
              .storeAddress(this.address)
              .storeAddress(this.address)
              .storeCoins(0)
              .storeUint(0, 1)
              .endCell(),
          )
          .endCell(),
      });
    }

    static changeAdminMessage(newOwner: Address) {
      return beginCell()
        .storeUint(JettonMinterOpCodes.change_admin, 32)
        .storeUint(0, 64) // op, queryId
        .storeAddress(newOwner)
        .endCell();
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address) {
      await provider.internal(via, {
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: JettonMinter.changeAdminMessage(newOwner),
        value: toNano('0.05'),
      });
    }

    async getWalletAddress(provider: ContractProvider, address: Address): Promise<Address> {
      const result = await provider.get('get_wallet_address', [
        {
          type: 'slice',
          cell: beginCell().storeAddress(address).endCell(),
        } as TupleItemSlice,
      ]);

      return result.stack.readAddress();
    }

    async getTotalsupply(provider: ContractProvider): Promise<bigint> {
      const result = await provider.get('get_jetton_data', []);
      return result.stack.readBigNumber();
    }
  }
}

export default JettonMinterWrapper;
