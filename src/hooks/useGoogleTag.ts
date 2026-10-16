import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { gadsPageView } from "@/lib/google-tag";

/** Visualização de página do Google Ads a cada troca de rota (o GA4 mede as trocas sozinho). */
export function useGoogleTag() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);

  useEffect(() => {
    // A primeira página já foi contada pelo `config` do <head>.
    if (first.current) {
      first.current = false;
      return;
    }
    gadsPageView(path);
  }, [path]);
}
