import { crc32 } from '../../utils';

namespace PositionWrapper {
  export const Opcodes = {
    CallbackPoolBurn: crc32('op::cb_pool_burn'),
  };
}

export default PositionWrapper;
