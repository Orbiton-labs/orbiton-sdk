import { Address, beginCell } from '@ton/ton';

export function parseAddress(address: string): Address {
  try {
    return Address.parse(address);
  } catch (error) {
    throw new Error(`${address} is not a valid address.`);
  }
}

// @dev compare two addresses lexicographically
// @param x - first address
// @param y - second address
// @return - -1 if x is less than y, 0 if x is equal to y, 1 if x is greater than y
export function compareAddresses(x: Address, y: Address): -1 | 0 | 1 {
  const xHash = BigInt(`0x${beginCell().storeAddress(x).endCell().hash().toString('hex')}`);
  const yHash = BigInt(`0x${beginCell().storeAddress(y).endCell().hash().toString('hex')}`);
  return xHash < yHash ? -1 : xHash === yHash ? 0 : 1;
}
