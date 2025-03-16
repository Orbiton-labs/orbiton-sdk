import { Address, beginCell, Cell, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';
import JettonMinterWrapper from './JettonMinter';
import { PTON_MASTER_BOC } from '../../constants';

export namespace PTonMinterWrapper {

    export type MinterConfig = {
        id?: number,
        walletCode: Cell,
        content: Cell,
    };

    export function minterConfigToCell(config: MinterConfig): Cell {
        return beginCell()
            .storeUint(config.id || 0, 32)
            .storeRef(config.walletCode)
            .storeRef(config.content)
            .endCell();
    }

    export const proxyOpCodesV2 = {
        ...JettonMinterWrapper.JettonMinterOpCodes,
        deployWallet: 0x4f5f4313
    } as const;


    export class PTonMinterV2 extends JettonMinterWrapper.JettonMinter {
        constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell; }) {
            super(address, init)
        }

        static createPtonMinterFromConfig(config: MinterConfig,  workchain = 0) {
            const code = Cell.fromBoc(Buffer.from(PTON_MASTER_BOC, 'hex'))[0];
            const data = minterConfigToCell(config);
            const init = { code, data };
            return new PTonMinterV2(contractAddress(workchain, init), init);
        }

        async sendDeployWallet(provider: ContractProvider, via: Sender, opts: {
            value?: bigint,
            ownerAddress: Address,
            excessesAddress?: Address
        }, value?: bigint) {
            return await provider.internal(via, {
                value: value ?? toNano("1"),
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell()
                    .storeUint(proxyOpCodesV2.deployWallet, 32)
                    .storeUint(0, 64)
                    .storeAddress(opts.ownerAddress)
                    .storeAddress(opts.excessesAddress || via.address)
                    .endCell()
            });
        }
    }
}

export default PTonMinterWrapper;