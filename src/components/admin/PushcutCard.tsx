import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addPushcutFn,
  getPushcutStatus,
  removePushcutFn,
  testPushcutFn,
} from "@/lib/pushcut.functions";

type Recipient = { id: string; name: string; url: string | null };

/** Traduz os erros do Pushcut (vêm em inglês, às vezes como JSON) para o que fazer. */
function explainPushcutError(r: { status?: number | undefined; error?: string | undefined }) {
  const raw = r.error ?? "";
  let msg = raw;
  try {
    msg = String((JSON.parse(raw) as { error?: unknown }).error ?? raw);
  } catch {
    // texto puro
  }
  if (/invalid secret/i.test(msg))
    return "a URL do webhook está errada ou incompleta. No app do Pushcut, abra a notificação, toque em Webhook, copie a URL inteira de novo e salve.";
  if (/notification.*not found|not found/i.test(msg) || r.status === 404)
    return "o Pushcut não encontrou essa notificação. Confira se ela existe no app com o mesmo nome que está no fim da URL, copie a URL de novo e salve.";
  if (r.status === 401 || r.status === 403)
    return "acesso recusado pelo Pushcut. Copie a URL do webhook de novo no app e salve.";
  if (r.status === 429) return "muitas notificações seguidas. Espere um minuto e teste de novo.";
  if (/abort/i.test(msg)) return "o Pushcut demorou para responder. Tente de novo.";
  return msg || `erro ${r.status ?? ""}`;
}

/**
 * Notificações de venda no celular (Pushcut): Pix gerado e Pix pago, com o valor. Cada pessoa
 * cadastrada recebe os avisos no próprio app; dá para adicionar e apagar pessoas.
 */
export function PushcutCard({ password }: { password: string }) {
  const statusFn = useServerFn(getPushcutStatus);
  const addFn = useServerFn(addPushcutFn);
  const removeFn = useServerFn(removePushcutFn);
  const testFn = useServerFn(testPushcutFn);
  const [list, setList] = useState<Recipient[] | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () =>
    statusFn({ data: { password } })
      .then((r) => setList(r.recipients))
      .catch(() => setList(null));

  useEffect(() => {
    if (password) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setMsg(null);
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(e instanceof Error && e.message ? e.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    void run("add", async () => {
      await addFn({
        data: { password, name: name.trim(), url: url.trim() },
      });
      const who = name.trim();
      setName("");
      setUrl("");
      return `Pronto: ${who} vai receber os avisos. Use os botões de teste para conferir no celular.`;
    });
  };

  const remove = (r: Recipient) => {
    if (!window.confirm(`Apagar ${r.name}? Essa pessoa para de receber os avisos de venda.`))
      return;
    void run(`remove-${r.id}`, async () => {
      await removeFn({ data: { password, id: r.id } });
      return `Pronto: ${r.name} não recebe mais os avisos.`;
    });
  };

  const test = (r: Recipient, kind: "pending" | "paid") =>
    run(`test-${kind}-${r.id}`, async () => {
      const res = await testFn({ data: { password, kind, id: r.id } });
      if (res.ok) return `Teste enviado para ${r.name} (R$ 99,90). Confira no celular.`;
      return `O Pushcut de ${r.name} não aceitou: ${explainPushcutError(res)}`;
    });

  const count = list?.length ?? 0;

  return (
    <Card className="mt-3 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BellRing className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <div className="font-medium">Notificações de venda (Pushcut)</div>
            <div className="text-xs text-muted-foreground">
              Avisa no celular com o valor da venda: "Pix gerado" quando o cliente gera o Pix e
              "Venda aprovada" quando paga. Cada pessoa cadastrada recebe no próprio app com um
              webhook só (Pushcut → Notifications → Webhook).
            </div>
          </div>
        </div>
        <span
          className={`text-xs whitespace-nowrap ${count ? "text-emerald-600" : "text-destructive"}`}
        >
          {list === null
            ? "…"
            : count
              ? `${count} ${count === 1 ? "pessoa" : "pessoas"}`
              : "Ninguém"}
        </span>
      </div>

      {count > 0 && (
        <ul className="rounded-md border divide-y">
          {(list ?? []).map((r) => (
            <li
              key={r.id}
              className="p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground break-all">{r.url}</div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => test(r, "pending")}
                >
                  {busy === `test-pending-${r.id}` ? "Enviando…" : "Testar pendente"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => test(r, "paid")}
                >
                  {busy === `test-paid-${r.id}` ? "Enviando…" : "Testar paga"}
                </Button>
                <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => remove(r)}>
                  {busy === `remove-${r.id}` ? "Apagando…" : "Apagar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="text-sm font-medium">Adicionar pessoa</div>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Nome</span>
          <Input
            className="mt-1"
            autoComplete="off"
            placeholder="Ex.: Pedro"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">
            Webhook do Pushcut (recebe a venda pendente e a aprovada)
          </span>
          <Input
            className="mt-1"
            autoComplete="off"
            placeholder="https://api.pushcut.io/.../notifications/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <div>
          <Button type="submit" size="sm" disabled={!name.trim() || !url.trim() || !!busy}>
            {busy === "add" ? "Adicionando…" : "Adicionar pessoa"}
          </Button>
        </div>
      </form>
      {msg && <p className="text-xs">{msg}</p>}
    </Card>
  );
}
