import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { brand } from "@/lib/brand";
import { getSiteSettings } from "@/lib/site-settings.functions";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato | Mumm Baby" },
      {
        name: "description",
        content:
          "Fale com a equipe Mumm Baby. Atendimento humano para pedidos e dúvidas sobre os lenços Mumm Baby.",
      },
      { property: "og:title", content: "Contato Mumm Baby" },
      { property: "og:description", content: "Fale com a equipe Mumm Baby." },
      { property: "og:url", content: "/contato" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: Page,
});

function Page() {
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });
  const whatsappEnabled = settings?.whatsappEnabled ?? false;
  const whatsappHref = `https://wa.me/${brand.whatsapp.phoneE164}?text=${encodeURIComponent(
    "Olá! Quero tirar uma dúvida sobre os lenços Mumm Baby.",
  )}`;
  // O formulário não tem servidor de e-mail: abre o WhatsApp (ou o e-mail) com a mensagem pronta.
  const channel = whatsappEnabled ? "whatsapp" : brand.email ? "email" : null;
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = `Olá! Sou ${f.get("nome")} (${f.get("email")}).\n\n${f.get("mensagem")}`;
    if (channel === "whatsapp")
      window.open(
        `https://wa.me/${brand.whatsapp.phoneE164}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener",
      );
    else if (channel === "email")
      window.location.href = `mailto:${brand.email}?subject=${encodeURIComponent("Contato pelo site")}&body=${encodeURIComponent(text)}`;
  };
  return (
    <SiteLayout>
      <section className="pt-32 md:pt-44 pb-24">
        <div className="container-edge grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <span className="eyebrow text-[var(--primary)]">Suporte</span>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] mt-6 text-balance">
              Estamos aqui <br />
              <span className="italic">para ajudar.</span>
            </h1>
            <p className="mt-6 text-[var(--ink)]/70 leading-relaxed max-w-sm">
              Fale com a nossa equipe sobre pedidos, entregas e os lenços Mumm Baby.
            </p>
            <ul className="mt-12 space-y-6 text-sm">
              {brand.email && (
                <li className="border-b border-[rgba(13,13,13,0.08)] pb-5">
                  <div className="eyebrow text-[var(--ink)]/40 mb-2">Email</div>
                  <a href={`mailto:${brand.email}`} className="hover:underline">
                    {brand.email}
                  </a>
                </li>
              )}
              {whatsappEnabled && (
                <li className="border-b border-[rgba(13,13,13,0.08)] pb-5">
                  <div className="eyebrow text-[var(--ink)]/40 mb-2">WhatsApp</div>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline"
                    aria-label={`Chamar no WhatsApp ${brand.whatsapp.display}`}
                  >
                    +55 {brand.whatsapp.display}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <form
            className="lg:col-span-7 bg-white p-10 md:p-12 border border-[rgba(13,13,13,0.08)] rounded-xl space-y-8"
            onSubmit={onSubmit}
          >
            <Field label="Nome" name="nome" />
            <Field label="Email" name="email" type="email" />
            <Field label="Mensagem" name="mensagem" textarea />
            <button
              disabled={!channel}
              className="w-full bg-[var(--primary)] text-white py-5 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {channel === "email" ? "Enviar por email" : "Enviar pelo WhatsApp"}
            </button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
}) {
  const cls =
    "mt-3 w-full border-0 border-b border-[rgba(13,13,13,0.2)] bg-transparent px-0 py-3 focus:outline-none focus:border-[var(--ink)] transition-colors text-base";
  return (
    <label className="block">
      <span className="eyebrow text-[var(--ink)]/60">{label}</span>
      {textarea ? (
        <textarea required name={name} rows={5} className={cls} />
      ) : (
        <input required name={name} type={type} className={cls} />
      )}
    </label>
  );
}
