import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { brand } from "@/lib/brand";

const BASE_URL = brand.siteUrl;

const paths = [
  "/", "/produto", "/sobre", "/contato", "/faq", "/rastreio",
  "/politica-envio", "/politica-privacidade", "/politica-reembolso",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...paths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
