import { Address } from '@ton/core';
import { computePoolAddress } from './functions/computePoolAddress';

const main = async () => {
  const address = computePoolAddress(
    Address.parse('EQART010_12r5NjW9zDGnGrFX6JOTlQ5XTg7uZpg0qyDcsma'),
    Address.parse('EQDeB39VrFtAzvTP6xwTZw5zWlxS0lthkTOum84-GSLLxbhh'),
    Address.parse('EQBkrDlsuxmYINv9OjKG33CFHJvoL7kQbtMXoZdwtIK3hTFE'),
    3000n,
    60n,
  );
  console.log(address.toString());
};

main();
