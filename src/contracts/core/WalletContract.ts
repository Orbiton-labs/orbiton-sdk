import {
  Cell,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from '@ton/ton';
import { WalletVersion } from '../../@types';
import {
  WalletV3SendArgsSignable,
  WalletV3SendArgsSigned,
} from '@ton/ton/dist/wallets/WalletContractV3Types';
import {
  Wallet4SendArgsSignable,
  Wallet4SendArgsSigned,
} from '@ton/ton/dist/wallets/WalletContractV4';

// function overloading
interface IWalletContract {
  createTransfer<T extends WalletV3SendArgsSigned | WalletV3SendArgsSignable>(
    args: T,
  ): T extends WalletV3SendArgsSignable ? Promise<Cell> : Cell;

  createTransfer<T extends Wallet4SendArgsSigned | Wallet4SendArgsSignable>(
    args: T,
  ): T extends Wallet4SendArgsSignable ? Promise<Cell> : Cell;
}

export type WalletContracts =
  | WalletContractV5R1
  | WalletContractV3R1
  | WalletContractV3R2
  | WalletContractV4;

export class WalletContract {
  private constructor() {}

  public static create = (
    workchain: number,
    publicKey: Buffer,
    version: WalletVersion,
  ): IWalletContract => {
    switch (version) {
      case WalletVersion.V3R1:
        return WalletContractV3R1.create({ workchain, publicKey });
      case WalletVersion.V3R2:
        return WalletContractV3R2.create({ workchain, publicKey });
      case WalletVersion.V4R1:
        throw new Error('Unsupported wallet contract version - v4R1');
      case WalletVersion.V4R2:
        return WalletContractV4.create({ workchain, publicKey });
      case WalletVersion.V5R1:
        return WalletContractV5R1.create({ workchain, publicKey });
      default:
        throw new Error(`Unsupported wallet contract version - ${version}`);
    }
  };
}
