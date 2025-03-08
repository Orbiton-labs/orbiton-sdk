import { SendMode } from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';

export type ValueOps = {
  value: bigint | string;
  queryId?: number;
  bounce?: Maybe<boolean>;
  sendMode?: SendMode;
};
export * from './core';
