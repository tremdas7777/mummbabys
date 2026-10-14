import { z } from "zod";
import { DEFAULT_BUNDLE_ID, parseBundleId, type BundleId } from "@/lib/bundles";

const bundleParamSchema = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.enum(["1", "2", "3"]),
);

/** Query string dos kits (?plano=1|2|3 — kit escolhido). */
export const planSearchSchema = z.object({
  plano: bundleParamSchema.optional(),
});

export type PlanSearch = z.infer<typeof planSearchSchema>;

export function bundleIdFromSearch(search: PlanSearch): BundleId {
  return parseBundleId(search.plano) ?? DEFAULT_BUNDLE_ID;
}
