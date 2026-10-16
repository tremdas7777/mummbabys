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
const PEDRO: PushcutRecipient = { id: "p1", name: "Pedro", ...URLS };
const ANA: PushcutRecipient = {
  id: "a1",
  name: "Ana",
  pending: "",
  paid: "https://api.pushcut.io/zzz999/notifications/Venda",
};
const urlsCalled = (m: { mock: { calls: unknown[][] } }) => m.mock.calls.map((c) => String(c[0]));

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

  it("manda venda paga para o webhook de venda paga e pendente para o de pendente", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await notifyPushcut("paid", { amountCents: 9990, orderId: "1" }, [PEDRO]);
    await notifyPushcut("pending", { amountCents: 6990, orderId: "2" }, [PEDRO]);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(URLS.paid);
    expect(String((fetchMock.mock.calls[1] as unknown[])[0])).toBe(URLS.pending);
    const body = JSON.parse(
      String(((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body),
    );
    expect(body.input).toBe("99.90");
  });

  it("com um só webhook, ele recebe os dois avisos; sem nenhum, não envia nada", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await notifyPushcut("paid", { amountCents: 100, orderId: "1" }, [{ ...PEDRO, paid: "" }]);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(URLS.pending);
    const r = await notifyPushcut("paid", { amountCents: 100, orderId: "1" }, []);
    expect(r.skipped).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    // Ana só tem o webhook de venda paga: ele recebe também a pendente.
    expect(urlsCalled(fetchMock)).toEqual([URLS.pending, ANA.paid]);
    expect(r).toMatchObject({ ok: true, sent: ["p1", "a1"] });
  });

  it("se um falhar, a nova tentativa só manda para quem não recebeu", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url) === ANA.paid
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
    expect(urlsCalled(fetchMock)).toEqual([ANA.paid]);
    expect(retry.sent).toEqual(["p1"]);
  });

  it("webhooks do formato antigo viram a primeira pessoa; a lista nova vale por cima", async () => {
    db.rows = [
      { key: "pushcut_pending_url", value: URLS.pending },
      { key: "pushcut_paid_url", value: URLS.paid },
    ];
    expect(await getPushcutRecipients()).toEqual([{ id: "principal", name: "Principal", ...URLS }]);
    db.rows = [...db.rows, { key: "pushcut_recipients", value: JSON.stringify([ANA]) }];
    expect(await getPushcutRecipients()).toEqual([ANA]);
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
