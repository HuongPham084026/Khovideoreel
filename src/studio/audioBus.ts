/** Phát nhạc / giọng đọc khi xem trước. Dùng Web Audio để âm lượng vượt 100% (đến 200%) và mờ dần vào/ra hoạt động. */
type Node = { src: MediaElementAudioSourceNode; gain: GainNode };

export class AudioBus {
  ctx: AudioContext | null = null;
  els = new Map<string, HTMLAudioElement>();
  private nodes = new Map<string, Node>();

  register(id: string, el: HTMLAudioElement) {
    if (this.els.get(id) === el) return;
    this.els.set(id, el);
    this.connect(id);
  }
  unregister(id: string) {
    this.els.get(id)?.pause();
    this.els.delete(id);
    this.nodes.delete(id);
  }

  /** Phải gọi trong lúc người dùng bấm (phát) để trình duyệt cho phép âm thanh */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    void this.ctx.resume();
    for (const id of this.els.keys()) this.connect(id);
  }

  private connect(id: string) {
    const el = this.els.get(id);
    if (!this.ctx || !el || this.nodes.has(id)) return;
    try {
      const src = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      src.connect(gain).connect(this.ctx.destination);
      this.nodes.set(id, { src, gain });
    } catch { /* phần tử này đã được nối trước đó */ }
  }

  setGain(id: string, g: number) {
    const n = this.nodes.get(id);
    const el = this.els.get(id);
    if (n) { n.gain.gain.value = Math.max(0, g); if (el) el.volume = 1; }
    else if (el) el.volume = Math.max(0, Math.min(1, g));
  }
}
