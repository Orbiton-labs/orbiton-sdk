import { Address, beginCell, Cell, ContractProvider, ExternalAddress, Sender, SendMode, Slice } from '@ton/core';
import JettonWalletWrapper from './JettonWallet';
import { ValueOps } from '..';
import { OpJettonTransferMint, OpJettonTransferSwap } from '../../tlbs/jetton';

export namespace PTonWalletWrapper {
    export type WalletConfig = {
        balance: bigint,
        ownerAddress: Address,
        minterAddress: Address,
    };

    export function walletConfigToCell(config: WalletConfig): Cell {
        return beginCell()
            .storeCoins(config.balance)
            .storeAddress(config.ownerAddress)
            .storeAddress(config.minterAddress)
            .endCell();
    }

    export const proxyWalletOpcodesV2 = {
        ...JettonWalletWrapper.JettonOpCodes,
        resetGas: 0x29d22935,
        tonTransfer: 0x01f3835d
    } as const;

    export class PTonWalletV2 extends JettonWalletWrapper.JettonWallet {
        constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell; }) {
            super( address, init)
        }

        static createFromConfig(config: JettonWalletWrapper.JettonWalletConfig, workchain = 0) {
            return JettonWalletWrapper.JettonWallet.createFromConfig(config, workchain)
        }

        static createFromAddress(address: Address) {
            return new PTonWalletV2(address);
        }

        async sendTransferMint(provider: ContractProvider, via: Sender, data: OpJettonTransferMint, opts: ValueOps): Promise<void> {
            throw new Error("Not implemented");
        }

        async sendTransferSwap(provider: ContractProvider, via: Sender, data: OpJettonTransferSwap, opts: ValueOps): Promise<void> {
            throw new Error("Not implemented");
        }

        async sendTonTransfer(provider: ContractProvider, via: Sender, opts: {
            tonAmount: bigint,
            refundAddress: Address | ExternalAddress | null
            fwdPayload: Cell | Slice,
            gas: bigint,
            noPayloadOverride?: boolean // only used to test refund
        }, value?: bigint) {
            if (!opts.gas) throw new Error("gas is 0")

            let msg_builder = beginCell()
                .storeUint(proxyWalletOpcodesV2.tonTransfer, 32)
                .storeUint(0, 64)
                .storeCoins(opts.tonAmount)
                .storeAddress(opts.refundAddress)

            let msg: Cell;
            if (opts.noPayloadOverride) {
                msg = msg_builder.endCell();
            } else {
                if (opts.fwdPayload instanceof Cell) {
                    msg = msg_builder
                        .storeUint(1, 1)
                        .storeRef(opts.fwdPayload)
                        .endCell();
                } else {
                    msg = msg_builder
                        .storeUint(0, 1)
                        .storeSlice(opts.fwdPayload)
                        .endCell();
                }
            }

            await provider.internal(via, {
                value: value ?? (opts.tonAmount + opts.gas),
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: msg,
            });
        }

        async sendResetGas(provider: ContractProvider, via: Sender, value: bigint) {
            await provider.internal(via, {
                value: value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell()
                    .storeUint(proxyWalletOpcodesV2.resetGas, 32)
                    .storeUint(0, 64)
                    .endCell(),
            });
        }

    }
}