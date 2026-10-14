import { createFileRoute, redirect } from "@tanstack/react-router";
import { planSearchSchema } from "@/lib/plan-search";

/** A loja tem uma página só: /produto leva para a inicial, mantendo o kit e as UTMs. */
export const Route = createFileRoute("/produto")({
  validateSearch: planSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search, replace: true });
  },
});
