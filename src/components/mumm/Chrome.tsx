import { Link } from "@tanstack/react-router";
import { brand } from "@/lib/brand";
import { FREE_SHIPPING_LABEL } from "@/lib/bundles";

/** Faixa do topo + cabeçalho da vitrine. */
export function MummHeader() {
  return (
    <>
      <div className="mb-util">
        {FREE_SHIPPING_LABEL} · Pix com aprovação na hora
      </div>
      <header className="mb-hdr">
        <div className="wrap">
          <Link to="/" className="mb-logo" aria-label={`${brand.name}, início`}>
            {brand.name}
          </Link>
          <nav aria-label="Atalhos">
            <a href="/#duvidas">Dúvidas</a>
            <Link to="/rastreio">Rastrear pedido</Link>
            <Link to="/contato">Contato</Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export function MummFooter() {
  const { legalName, cnpj } = brand.company;
  const wa = brand.whatsapp.phoneE164;
  return (
    <footer className="mb-ft">
      <div className="wrap">
        <div className="cols">
          <div>
            <Link to="/" className="mb-logo">
              {brand.name}
            </Link>
            <span>{brand.tagline}.</span>
          </div>
          <div>
            <h5>Loja</h5>
            <Link to="/">Lenços umedecidos</Link>
            <Link to="/faq">Dúvidas</Link>
            <Link to="/rastreio">Rastrear pedido</Link>
          </div>
          <div>
            <h5>Políticas</h5>
            <Link to="/politica-reembolso">Trocas e devoluções</Link>
            <Link to="/politica-envio">Envio</Link>
            <Link to="/politica-privacidade">Privacidade</Link>
          </div>
          <div>
            <h5>Atendimento</h5>
            <Link to="/contato">Contato</Link>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                WhatsApp {brand.whatsapp.display}
              </a>
            )}
            {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
            <span>Seg. a sex., 8h às 18h</span>
          </div>
        </div>
        <div className="legal">
          {(legalName || cnpj) && (
            <>
              {[legalName, cnpj && `CNPJ ${cnpj}`].filter(Boolean).join(" · ")}
              <br />
            </>
          )}
          © {new Date().getFullYear()} {brand.name}. Pagamento via Pix.
          {brand.anvisa && ` Registro ANVISA nº ${brand.anvisa}.`}
        </div>
      </div>
    </footer>
  );
}
