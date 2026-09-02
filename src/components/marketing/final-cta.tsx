import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { ROUTES } from "@/constants/routes";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <Reveal className="relative overflow-hidden rounded-2xl bg-secondary px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,color-mix(in_oklch,var(--primary),transparent_75%),transparent)]"
          />
          <h2 className="text-balance font-heading text-3xl font-semibold tracking-tight text-secondary-foreground sm:text-4xl">
            Ready to upgrade your digital experience?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-secondary-foreground/80">
            Instant delivery, verified accounts, and 24/7 support on every order.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={ROUTES.shop}>Shop Now</Link>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
