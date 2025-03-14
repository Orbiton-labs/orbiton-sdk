import { Address } from '@ton/core';
import { AbstractJetton } from './abtractJetton';
import { parseAddress } from '../utils/address';
import { beginCell } from '@ton/core';
import invariant from 'tiny-invariant';
import { TonClient } from '@ton/ton';
import { JettonMinterWrapper } from '../contracts';

export class Jetton extends AbstractJetton {
  public readonly address: Address;
  public walletAddress?: Address;
  public readonly isToken: true = true;

  public constructor(
    address: string,
    decimals: number,
    symbol: string,
    name?: string,
    image?: string,
  ) {
    super(decimals, symbol, name, image);
    this.address = parseAddress(address);
  }

  public async setWalletAddress(tonClient: TonClient, userAddress: Address) {
    const jettonMinterContract = tonClient.open(
      JettonMinterWrapper.JettonMinter.createFromAddress(this.address),
    );
    const jettonWallet = await jettonMinterContract.getWalletAddress(userAddress);
    this.walletAddress = jettonWallet;
  }

  /**
   * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
   * @param other other token to compare
   */
  public equals(other: Jetton): boolean {
    return other.isToken && this.address.equals(other.address);
  }

  /**
   * Returns true if the address of this token sorts before the address of the other token
   * @param other other token to compare
   * @throws if the tokens have the same address
   * @throws if the tokens are on different chains
   */
  public sortsBefore(other: Jetton): boolean {
    invariant(this?.walletAddress, 'X: WALLET_ADDRESS');
    invariant(other?.walletAddress, 'Y: WALLET_ADDRESS');
    invariant(this.walletAddress !== other.walletAddress, 'ADDRESSES');
    return (
      BigInt(`0x${beginCell().storeAddress(this.walletAddress).endCell().hash().toString('hex')}`) <
      BigInt(`0x${beginCell().storeAddress(other.walletAddress).endCell().hash().toString('hex')}`)
    );
  }

  //   /**
  //    * Return this token, which does not need to be wrapped
  //    */
  public get wrapped(): Jetton {
    return this;
  }
}
