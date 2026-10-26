import { EnvCtx, type Env } from "./env";
import { TEMPLATES, type Fields } from "./index";

/** Dựng một mẫu theo id, dùng chung cho xem trước (Player) và xuất video */
export function TemplateRunner({ tid, f, env }: { tid: string; f: Fields; env: Env }) {
  const t = TEMPLATES.find((x) => x.id === tid);
  if (!t) return null;
  return <EnvCtx.Provider value={env}><t.Comp f={f} /></EnvCtx.Provider>;
}
