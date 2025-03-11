import { Address, beginCell, Cell, Dictionary } from '@ton/core';
import { storePositionStorage } from '../tlbs/position';
import { POSITION_BOC } from '../constants';

const packPositionData = (
  tickLower: bigint,
  tickUpper: bigint,
  owner: Address,
  poolAddress: Address,
) => {
  const builder = beginCell();
  storePositionStorage({
    kind: 'PositionStorage',
    first_ref: {
      kind: 'PositionFirst',
      fee_growth_inside0_last_x128: 0n,
      fee_growth_inside1_last_x128: 0n,
      liquidity: 0n,
      tick_lower: Number(tickLower),
      tick_upper: Number(tickUpper),
    },
    second_ref: {
      kind: 'PositionSecond',
      owner_address: owner,
      pool_address: poolAddress,
      token_owed0: 0n,
      token_owed1: 0n,
    },
  })(builder);
  return builder.endCell();
};

export const computePositionAddress = (
  tickLower: bigint,
  tickUpper: bigint,
  owner: Address,
  poolAddress: Address,
  workchain: number = 0,
) => {
  const positionData = packPositionData(tickLower, tickUpper, owner, poolAddress);
  const stateInitBuilder = beginCell()
    .storeUint(0, 2)
    .storeSlice(Cell.fromBoc(Buffer.from(POSITION_BOC, 'hex'))[0].asSlice())
    .storeSlice(positionData.asSlice())
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
