import { useMemo } from "react";
import type { LoopSnapshot } from "@immigration/shared";

import { localLoopRepository } from "./repository";

export function useLoopSnapshot(): LoopSnapshot {
  return useMemo(() => localLoopRepository.getSnapshot(), []);
}
