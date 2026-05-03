import type { Monitor } from "../db/schema";

export interface CheckResult {
  status: 0 | 1; // 0 = down, 1 = up
  ping: number | null;
  msg: string;
}

export type { Monitor };
