import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pw = z.object({ password: z.string().min(1).max(200) });

function assertAdmin(password: string) {
  if (password !== process.env["ADMIN_PASSWORD"]) throw new Error("Não autorizado");
}

/** A URL do Pushcut tem um token secreto no caminho: mostra só o começo e o fim. */
function mask(url: string): string | null {
  if (!url) return null;
  return url.length <= 40 ? `${url.slice(0, 28)}…` : `${url.slice(0, 34)}…${url.slice(-6)}`;
}

/** Pessoas cadastradas (URLs mascaradas). */
export const getPushcutStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pw.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { getPushcutRecipients } = await import("@/lib/pushcut.server");
    const list = await getPushcutRecipients();
    return {
      recipients: list.map((r) => ({ id: r.id, name: r.name, url: mask(r.url) })),
    };
  });

/** Adiciona uma pessoa com o webhook dela (recebe a venda pendente e a aprovada). */
export const addPushcutFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    pw
      .extend({
        name: z.string().trim().min(1, "Dê um nome para a pessoa (ex.: Pedro).").max(40),
        url: z.string().trim().min(1, "Cole o webhook do Pushcut.").max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { getPushcutRecipients, savePushcutRecipients, MAX_PUSHCUT_RECIPIENTS } =
      await import("@/lib/pushcut.server");
    const list = await getPushcutRecipients();
    if (list.length >= MAX_PUSHCUT_RECIPIENTS)
      throw new Error(`Limite de ${MAX_PUSHCUT_RECIPIENTS} pessoas. Apague alguém antes.`);
    const dup = list.find((r) => r.url === data.url);
    if (dup) throw new Error(`Esse webhook já está cadastrado para ${dup.name}.`);
    await savePushcutRecipients([
      ...list,
      {
        id: crypto.randomUUID().slice(0, 8),
        name: data.name,
        url: data.url,
      },
    ]);
    return { ok: true };
  });

/** Apaga uma pessoa: ela para de receber os avisos. */
export const removePushcutFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pw.extend({ id: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { getPushcutRecipients, savePushcutRecipients } = await import("@/lib/pushcut.server");
    const list = await getPushcutRecipients();
    await savePushcutRecipients(list.filter((r) => r.id !== data.id));
    return { ok: true };
  });

/** Envia uma notificação de teste (valor de exemplo) só para uma pessoa, sem criar pedido. */
export const testPushcutFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    pw.extend({ kind: z.enum(["pending", "paid"]), id: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { getPushcutRecipients, notifyPushcut } = await import("@/lib/pushcut.server");
    const r = (await getPushcutRecipients()).find((x) => x.id === data.id);
    if (!r) throw new Error("Essa pessoa não está mais cadastrada. Atualize a página.");
    return notifyPushcut(data.kind, { amountCents: 9990, orderId: "TESTE123" }, [r]);
  });
