import { getHttpEndpoint } from '@orbs-network/ton-access';
import { Address, OpenedContract } from '@ton/core';
import { TonClient } from '@ton/ton';
import { PoolWrapper } from './contracts';
import { Jetton, JettonAmount } from './entities';

const poolAddr = 'EQCtpowhg8efNm364J51zDiKNT_CNnApUU-bor5Jpd7HzhR3';

const main = async () => {
  const client = new TonClient({
    endpoint: await getHttpEndpoint({
      network: 'testnet',
    }),
  });
  const poolContract = new PoolWrapper.Pool(Address.parse(poolAddr));
  const pool = client.open(poolContract) as OpenedContract<PoolWrapper.Pool>;
  const ticksInfo = await pool.getTicks().catch((err) => {
    console.log(err);
    return null;
  });
  console.log(ticksInfo);

  const usdc = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const usdcAmount = JettonAmount.fromRawAmount(usdc, 1000000000000000000n);
  console.log(usdcAmount.toSignificant());
};

main().catch((er) => console.log(er));
