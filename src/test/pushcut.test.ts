import { afterEach, describe, expect, it, vi } from "vitest";

// Linhas de private_settings que o banco "devolve" em cada teste.
const db = vi.hoisted(() => ({ rows: [] as { key: string; value: string }[] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ in: async () => ({ data: db.rows }) }) }),
  },
}));

import {
  getPushcutRecipients,
  isPushcutUrl,
  notifyPushcut,
  parseRecipients,
  pushcutMessage,
  type PushcutRecipient,
} from "@/lib/pushcut.server";

const URLS = {
  pending: "https://api.pushcut.io/abc123/notifications/Venda%20pendente",
  paid: "https://api.pushcut.io/abc123/notifications/Venda%20paga",
};
const PEDRO: PushcutRecipient = { id: "p1", name: "Pedro", url: URLS.paid };
const ANA: PushcutRecipient = {
  id: "a1",
  name: "Ana",
  url: "https://api.pushcut.io/zzz999/notifications/Venda",
};
const urlsCalled = (m: { mock: { calls: unknown[][] } }) => m.mock.calls.map((c) => String(c[0]));
const bodyOf = (m: { mock: { calls: unknown[][] } }, i: number) =>
  JSON.parse(String((m.mock.calls[i]?.[1] as RequestInit).body)) as {
    title: string;
    text: string;
    input: string;
  };

describe("Pushcut", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a notificação leva o valor da venda", () => {
    const paid = pushcutMessage("paid", {
      amountCents: 9990,
      orderId: "mp_abcdef123456",
    });
    expect(paid.title).toBe("Venda aprovada: R$ 99,90");
    expect(paid.text).toContain("R$ 99,90");
    expect(paid.text).not.toMatch(/Kit|aparelho/);
    expect(paid.text).toContain("EF123456");
    expect(paid.input).toBe("99.90");
    const pending = pushcutMessage("pending", {
      amountCents: 6990,
      orderId: "x1",
    });
    expect(pending.title).toBe("Pix gerado: R$ 69,90");
    expect(pending.text).toContain("aguardando pagamento");
  });

  it("só aceita URL de notificação do Pushcut", () => {
    expect(isPushcutUrl(URLS.paid)).toBe(true);
    expect(isPushcutUrl("https://exemplo.com/notifications/x")).toBe(false);
    expect(isPushcutUrl("http://api.pushcut.io/a/notifications/x")).toBe(false);
  });

  it("o mesmo webhook recebe venda pendente e aprovada, cada uma com o texto e o valor certos", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await notifyPushcut("pending", { amountCents: 6990, orderId: "2" }, [PEDRO]);
    await notifyPushcut("paid", { amountCents: 9990, orderId: "1" }, [PEDRO]);
    expect(urlsCalled(fetchMock)).toEqual([PEDRO.url, PEDRO.url]);
    expect(bodyOf(fetchMock, 0)).toMatchObject({ title: "Pix gerado: R$ 69,90", input: "69.90" });
    expect(bodyOf(fetchMock, 1)).toMatchObject({
      title: "Venda aprovada: R$ 99,90",
      input: "99.90",
    });
  });

  it("sem ninguém cadastrado, não envia nada", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const r = await notifyPushcut("paid", { amountCents: 100, orderId: "1" }, []);
    expect(r.skipped).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha no Pushcut não lança erro (não atrapalha a venda)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede caiu");
      }),
    );
    const r = await notifyPushcut("paid", { amountCents: 100, orderId: "1" }, [PEDRO]);
    expect(r.ok).toBe(false);
  });

  it("cada aviso vai para todas as pessoas cadastradas", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const r = await notifyPushcut("pending", { amountCents: 100, orderId: "1" }, [PEDRO, ANA]);
    expect(urlsCalled(fetchMock)).toEqual([PEDRO.url, ANA.url]);
    expect(r).toMatchObject({ ok: true, sent: ["p1", "a1"] });
  });

  it("se um falhar, a nova tentativa só manda para quem não recebeu", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url) === ANA.url
        ? new Response("Notification not found", { status: 404 })
        : new Response("ok"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const first = await notifyPushcut("paid", { amountCents: 100, orderId: "1" }, [PEDRO, ANA]);
    expect(first).toMatchObject({ ok: false, status: 404, sent: ["p1"], failed: ["Ana"] });
    fetchMock.mockClear();
    const retry = await notifyPushcut(
      "paid",
      { amountCents: 100, orderId: "1" },
      [PEDRO, ANA],
      first.sent,
    );
    expect(urlsCalled(fetchMock)).toEqual([ANA.url]);
    expect(retry.sent).toEqual(["p1"]);
  });

  it("formatos antigos viram um webhook por pessoa; a lista nova vale por cima", async () => {
    db.rows = [
      { key: "pushcut_pending_url", value: URLS.pending },
      { key: "pushcut_paid_url", value: URLS.paid },
    ];
    expect(await getPushcutRecipients()).toEqual([
      { id: "principal", name: "Principal", url: URLS.paid },
    ]);
    db.rows = [{ key: "pushcut_pending_url", value: URLS.pending }];
    expect(await getPushcutRecipients()).toEqual([
      { id: "principal", name: "Principal", url: URLS.pending },
    ]);
    // Lista da versão anterior (duas URLs por pessoa): fica a de venda paga, ou a única que houver.
    const older = [
      { id: "p1", name: "Pedro", pending: URLS.pending, paid: URLS.paid },
      { id: "a1", name: "Ana", pending: ANA.url, paid: "" },
    ];
    db.rows = [
      { key: "pushcut_paid_url", value: "https://api.pushcut.io/velho/notifications/x" },
      { key: "pushcut_recipients", value: JSON.stringify(older) },
    ];
    expect(await getPushcutRecipients()).toEqual([PEDRO, ANA]);
    db.rows = [{ key: "pushcut_recipients", value: "[]" }];
    expect(await getPushcutRecipients()).toEqual([]);
    db.rows = [];
  });

  it("lê a lista salva e ignora formato inválido", () => {
    expect(parseRecipients(JSON.stringify([PEDRO, ANA]))).toEqual([PEDRO, ANA]);
    expect(parseRecipients("[]")).toEqual([]);
    expect(parseRecipients("não é json")).toEqual([]);
    expect(parseRecipients(JSON.stringify([{ id: "x" }]))).toEqual([]);
  });
});
