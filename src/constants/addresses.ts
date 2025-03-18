import { Address } from '@ton/core';


export enum Chain {
    Mainnet = 'mainnet',
    Testnet = 'testnet',
}

export const ADDRESS_ZERO = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

export type ContractAddresses = {
    ROUTER: string;
    PTON_ROUTER_WALLET:string;
}

export const ContractAddressesFromChain: Record<Chain,ContractAddresses> = {
    [Chain.Mainnet]: {
        ROUTER: '',
        PTON_ROUTER_WALLET: '',
    },
    [Chain.Testnet]: {
        ROUTER: '',
        PTON_ROUTER_WALLET: '',
    }
}