import type { JsonLdNode } from "@/lib/json-ld";

/**
 * Renders one `<script type="application/ld+json">` per node — every JSON-LD block in this app
 * (breadcrumbs, organization/website, product, category, FAQ) goes through this rather than a
 * one-off `dangerouslySetInnerHTML` at each call site. `data` is always server-built from trusted
 * data (product/category/settings rows, hardcoded FAQ copy), never raw user input, which is what
 * makes `dangerouslySetInnerHTML` safe here — see each builder in `lib/json-ld.ts`.
 */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const nodes = Array.isArray(data) ? data : [data];

  return (
    <>
      {nodes.map((node, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />
      ))}
    </>
  );
}
