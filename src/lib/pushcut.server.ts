// Notificações de venda no celular pelo Pushcut. Somente servidor.
// Lista de pessoas cadastradas no /admin (private_settings, chave "pushcut_recipients"). Cada uma
// tem UMA URL de notificação, que recebe os dois avisos com o texto certo e o valor:
// - "pending": Pix gerado (aguardando pagamento)
// - "paid": Pix pago (venda aprovada)
// Cada aviso vai para todas as pessoas.
import { z } from "zod";
import { brl } from "@/lib/bundles";

export type PushcutKind = "pending" | "paid";

export type PushcutRecipient = { id: string; name: string; url: string };

const KEY = "pushcut_recipients";
/** Formato antigo (um par de URLs fora da lista): vira a primeira pessoa. */
const LEGACY: Record<PushcutKind, string> = {
  pending: "pushcut_pending_url",
  paid: "pushcut_paid_url",
};

export const MAX_PUSHCUT_RECIPIENTS = 20;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Só aceita URLs de notificação do próprio Pushcut (evita mandar dados de venda para outro lugar). */
export function isPushcutUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "api.pushcut.io" &&
      u.pathname.includes("/notifications/")
    );
  } catch {
    return false;
  }
}

const recipientsSchema = z.array(
  z
    .object({
      id: z.string().min(1).max(40),
      name: z.string().max(60),
      url: z.string().max(500).optional(),
      // Versão anterior da lista (uma URL para cada aviso): fica a de venda paga.
      pending: z.string().max(500).optional(),
      paid: z.string().max(500).optional(),
    })
    .transform((r) => ({ id: r.id, name: r.name, url: r.url || r.paid || r.pending || "" })),
);

/** Lista salva no banco (texto JSON). Formato inválido = lista vazia. */
export function parseRecipients(raw: unknown): PushcutRecipient[] {
  try {
    const parsed = recipientsSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
    return parsed.success ? parsed.data.filter((r) => r.url) : [];
  } catch {
    return [];
  }
}

export async function getPushcutRecipients(): Promise<PushcutRecipient[]> {
  const { data } = await (
    await db()
  )
    .from("private_settings")
    .select("key,value")
    .in("key", [KEY, ...Object.values(LEGACY)]);
  const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  if (map.has(KEY)) return parseRecipients(map.get(KEY));
  const url =
    String(map.get(LEGACY.paid) ?? "").trim() || String(map.get(LEGACY.pending) ?? "").trim();
  return url ? [{ id: "principal", name: "Principal", url }] : [];
}

/** Salva a lista inteira (adicionar/apagar pessoa = salvar a lista nova). */
export async function savePushcutRecipients(list: PushcutRecipient[]): Promise<void> {
  for (const r of list) {
    if (!isPushcutUrl(r.url)) {
      throw new Error(
        "Use a URL de notificação do Pushcut (https://api.pushcut.io/.../notifications/...).",
      );
    }
  }
  const client = await db();
  const { error } = await client
    .from("private_settings")
    .upsert({ key: KEY, value: JSON.stringify(list), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  // O formato antigo já está dentro da lista: sai do banco para não voltar depois de apagado.
  await client.from("private_settings").delete().in("key", Object.values(LEGACY));
}

/** Texto da notificação, sempre com o valor da venda. */
export function pushcutMessage(kind: PushcutKind, o: { amountCents: number; orderId: string }) {
  const value = brl(o.amountCents / 100);
  const order = o.orderId
    .replace(/^(pg_|mp_)/, "")
    .slice(-8)
    .toUpperCase();
  return {
    title: kind === "paid" ? `Venda aprovada: ${value}` : `Pix gerado: ${value}`,
    text:
      kind === "paid"
        ? `${value} · pedido ${order}`
        : `${value} aguardando pagamento · pedido ${order}`,
    // Valor numérico (ex.: "99.90") para usar em automações do Pushcut.
    input: (o.amountCents / 100).toFixed(2),
  };
}

export type PushcutResult = {
  ok: boolean;
  skipped?: string;
  status?: number;
  error?: string;
  /** Pessoas (id) que já receberam este aviso: numa nova tentativa só as outras recebem. */
  sent?: string[];
  /** Nomes de quem não recebeu. */
  failed?: string[];
};

async function send(
  url: string,
  kind: PushcutKind,
  o: { amountCents: number; orderId: string },
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!isPushcutUrl(url)) return { ok: false, error: "URL do Pushcut inválida" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pushcutMessage(kind, o)),
    });
    return res.ok
      ? { ok: true, status: res.status }
      : { ok: false, status: res.status, error: (await res.text()).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha de rede" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Envia a notificação para todas as pessoas (menos as de `alreadySent`). Nunca lança erro:
 * falha no Pushcut não pode atrapalhar a venda.
 */
export async function notifyPushcut(
  kind: PushcutKind,
  o: { amountCents: number; orderId: string },
  recipients?: PushcutRecipient[],
  alreadySent: string[] = [],
): Promise<PushcutResult> {
  try {
    const targets = (recipients ?? (await getPushcutRecipients()))
      .filter((r) => !alreadySent.includes(r.id))
      .map((r) => ({ r, url: r.url }))
      .filter((t) => t.url);
    if (!targets.length)
      return alreadySent.length
        ? { ok: true, sent: alreadySent }
        : { ok: true, skipped: "Pushcut sem URL" };
    const results = await Promise.all(
      targets.map(async (t) => ({ r: t.r, ...(await send(t.url, kind, o)) })),
    );
    const sent = [...alreadySent, ...results.filter((x) => x.ok).map((x) => x.r.id)];
    const failed = results.filter((x) => !x.ok);
    if (!failed.length) return { ok: true, status: results[0]?.status, sent };
    return {
      ok: false,
      status: failed[0]?.status,
      error: failed[0]?.error,
      sent,
      failed: failed.map((x) => x.r.name),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha de rede",
      sent: alreadySent,
    };
  }
}
