import { Address } from '@ton/core';
import { computePoolAddress } from './functions/computePoolAddress';
import { Jetton } from '.';

const main = async () => {
  const jetton1 = new Jetton('EQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo-WW', 9, 'USDC');
  const jetton2 = new Jetton('EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ', 6, 'Orbiton Swap');

  console.log({
    jetton1,
    jetton2,
  });
};

main();
