import type { Cue, CueWord } from "../templates/caption";

/** Gom các từ nhận dạng được thành cụm tối đa maxWords từ; ngắt thêm ở dấu câu hoặc khi có khoảng lặng dài */
export function groupWords(words: CueWord[], maxWords: number): Cue[] {
  const cues: Cue[] = [];
  let cur: CueWord[] = [];
  const flush = () => {
    if (!cur.length) return;
    cues.push({ s: cur[0].s, e: cur[cur.length - 1].e, t: cur.map((w) => w.w).join(" "), w: cur.map((w) => ({ w: w.w, s: w.s, e: w.e })) });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    if (prev && w.s - prev.e > 0.6) flush();
    cur.push(w);
    const end = /[.!?…,;:]$/.test(w.w);
    if (cur.length >= maxWords || end || i === words.length - 1) flush();
  });
  // cụm cuối giữ đến hết khoảng im ngắn kế tiếp để không nhấp nháy
  cues.forEach((c, i) => { const next = cues[i + 1]; if (next && next.s - c.e < 0.35) c.e = next.s; else c.e += 0.15; });
  return cues;
}
