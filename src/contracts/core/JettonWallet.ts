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
import { ValueOps } from '..';
import { JETTON_WALLET_BOC } from '../../constants';
import {
  OpJettonTransferMint,
  OpJettonTransferSwap,
  storeOpJettonTransferMint,
  storeOpJettonTransferSwap,
} from '../../tlbs/jetton';

namespace JettonWalletWrapper {
  export enum JettonOpCodes {
    TRANSFER = 0xf8a7ea5,
    TRANSFER_NOTIFICATION = 0x7362d09c,
    INTERNAL_TRANSFER = 0x178d4519,
    EXCESSES = 0xd53276db,
    BURN = 0x595f07bc,
    BURN_NOTIFICATION = 0x7bdd97de,
    MINT = 21,
  }

  export type JettonWalletConfig = {
    ownerAddress: Address;
    minterAddress: Address;
    walletCode: Cell;
  };

  export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
      .storeCoins(0)
      .storeAddress(config.ownerAddress)
      .storeAddress(config.minterAddress)
      .storeRef(config.walletCode)
      .endCell();
  }

  export class JettonWallet implements Contract {
    constructor(
      readonly address: Address,
      readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
      return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, workchain = 0) {
      const code = Cell.fromBoc(Buffer.from(JETTON_WALLET_BOC, 'hex'))[0];
      const data = jettonWalletConfigToCell(config);
      const init = { code, data };
      return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
      await provider.internal(via, {
        value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell().endCell(),
      });
    }

    async sendTransferMint(
      provider: ContractProvider,
      via: Sender,
      data: OpJettonTransferMint,
      opts: ValueOps,
    ) {
      const body = beginCell();
      storeOpJettonTransferMint(data)(body);
      await provider.internal(via, {
        value: opts.value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: body.endCell(),
      });
    }

    async sendTransferSwap(
      provider: ContractProvider,
      via: Sender,
      data: OpJettonTransferSwap,
      opts: ValueOps,
    ) {
      const body = beginCell();
      storeOpJettonTransferSwap(data)(body);
      await provider.internal(via, {
        value: opts.value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: body.endCell(),
      });
    }

    async getBalance(provider: ContractProvider) {
      const state = await provider.getState();
      if (state.state.type !== 'active') {
        return { amount: 0n };
      }
      const { stack } = await provider.get('get_wallet_data', []);
      const [amount] = [stack.readBigNumber()];
      return { amount };
    }

    async getWalletData(provider: ContractProvider) {
      const result = await provider.get('get_wallet_data', []);
      const balance = result.stack.readBigNumber();
      const owner = result.stack.readAddress();
      const jettonMasterAddress = result.stack.readAddress();
      return { balance, owner, jettonMasterAddress };
    }
  }
}

export default JettonWalletWrapper;
