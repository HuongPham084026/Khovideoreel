import { useSyncExternalStore } from "react";

/** Đồng hồ phát: chỉ các phần cần thời gian (đầu phát, số giây) mới vẽ lại mỗi khung hình */
export class Clock {
  t = 0;
  private subs = new Set<() => void>();
  set(v: number) {
    this.t = v;
    this.subs.forEach((f) => f());
  }
  sub = (f: () => void) => {
    this.subs.add(f);
    return () => this.subs.delete(f);
  };
  get = () => this.t;
}

export const useClock = (c: Clock) => useSyncExternalStore(c.sub, c.get);
