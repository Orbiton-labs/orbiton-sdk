import { Address } from '@ton/core';
import { computePoolAddress } from './computePoolAddress';
import { TonClient } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { JettonMinterWrapper, RouterWrapper } from '../contracts';

describe('#computePoolAddress', () => {
  it('should compute the correct pool address', async () => {
    const tonClient = new TonClient({
      endpoint: await getHttpEndpoint({
        network: 'testnet',
      }),
    });
    const routerContract = tonClient.open(
      RouterWrapper.Router.createFromAddress(
        Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
      ),
    );
    const jetton0MasterContract = tonClient.open(
      JettonMinterWrapper.JettonMinter.createFromAddress(
        Address.parse('kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c'),
      ),
    );
    const jetton1MasterContract = tonClient.open(
      JettonMinterWrapper.JettonMinter.createFromAddress(
        Address.parse('kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa'),
      ),
    );
    const jetton0Wallet = await jetton0MasterContract.getWalletAddress(
      Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
    );
    const jetton1Wallet = await jetton1MasterContract.getWalletAddress(
      Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
    );
    const fetchedPoolAddress = await routerContract.getPoolAddress(
      jetton0Wallet,
      jetton1Wallet,
      3000n,
      60n,
    );
    const poolAddress = computePoolAddress(
      Address.parse('EQCeuRLbIAm__PPiU-Ej-D6iR_4K1wAdF_ABttWUw086IzZu'),
      jetton0Wallet,
      jetton1Wallet,
      3000n,
      60n,
    );
    expect(poolAddress.toString()).toEqual(fetchedPoolAddress.toString());
  });
});
