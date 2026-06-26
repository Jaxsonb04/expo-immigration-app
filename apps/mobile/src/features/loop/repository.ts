import type { LoopSnapshot } from "@immigration/shared";

import { localLoopSnapshot } from "./local-data";

export interface LoopRepository {
  getSnapshot: () => LoopSnapshot;
}

export const localLoopRepository: LoopRepository = {
  getSnapshot: () => localLoopSnapshot,
};
