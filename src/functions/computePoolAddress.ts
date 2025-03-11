import { Address, beginCell, Cell, Dictionary } from '@ton/core';
import { LP_ACCOUNT_BOC, POOL_BOC, POSITION_BOC } from '../constants';

const packPoolData = (
  routerAddress: Address,
  jetton0Wallet: Address,
  jetton1Wallet: Address,
  fee: bigint,
  tickSpacing: bigint,
) => {
  return beginCell()
    .storeRef(
      beginCell()
        .storeSlice(beginCell().storeAddress(routerAddress).endCell().asSlice())
        .storeSlice(beginCell().storeAddress(jetton0Wallet).endCell().asSlice())
        .storeSlice(beginCell().storeAddress(jetton1Wallet).endCell().asSlice())
        .storeUint(fee, 24)
        .storeUint(0n, 8)
        .storeUint(0n, 160)
        .endCell(),
    )
    .storeRef(
      beginCell()
        .storeInt(tickSpacing, 24)
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
        .storeUint(0n, 128)
        .storeDict(Dictionary.empty())
        .storeRef(Cell.fromBoc(Buffer.from(POSITION_BOC, 'hex'))[0])
        .storeRef(Cell.fromBoc(Buffer.from(LP_ACCOUNT_BOC, 'hex'))[0])
        .endCell(),
    )
    .endCell();
};

export const computePoolAddress = (
  routerAddress: Address,
  jetton0Wallet: Address,
  jetton1Wallet: Address,
  fee: bigint,
  tickSpacing: bigint,
  workchain = 0,
) => {
  const stateInitBuilder = beginCell()
    .storeUint(0, 2)
    .storeMaybeRef(Cell.fromBoc(Buffer.from(POOL_BOC, 'hex'))[0])
    .storeMaybeRef(packPoolData(routerAddress, jetton0Wallet, jetton1Wallet, fee, tickSpacing))
    .storeUint(0, 1)
    .endCell();
  return beginCell()
    .storeUint(4, 3)
    .storeUint(workchain, 8)
    .storeUint(BigInt('0x' + stateInitBuilder.hash().toString('hex')), 256)
    .endCell()
    .beginParse()
    .loadAddress();
};
