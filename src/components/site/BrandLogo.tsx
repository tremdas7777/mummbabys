import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

/** Logo em texto da Mumm Baby (troque por uma imagem quando houver o arquivo do logo). */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-black leading-none tracking-tight text-[#0B5957] whitespace-nowrap",
        className,
      )}
      style={{ fontFamily: '"Nunito Sans", system-ui, sans-serif' }}
      aria-label={brand.name}
    >
      {brand.name}
    </span>
  );
}
