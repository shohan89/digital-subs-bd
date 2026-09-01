import { CreditCard, KeyRound, ShoppingBag } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";

const STEPS = [
  {
    title: "Choose Subscription",
    description: "Pick the product and plan that fits you from our catalogue.",
    icon: ShoppingBag,
  },
  {
    title: "Complete Payment",
    description: "Pay securely via bKash, Nagad, Rocket, or card.",
    icon: CreditCard,
  },
  {
    title: "Receive Access",
    description: "Get your account details instantly and start using it right away.",
    icon: KeyRound,
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle eyebrow="Process" title="How it works" align="center" className="items-center" />

        <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute top-6 right-[16.5%] left-[16.5%] hidden h-px bg-border sm:block"
          />

          {STEPS.map(({ title, description, icon: Icon }, index) => (
            <Reveal key={title} delay={index * 0.1} className="relative flex flex-col items-center gap-3 text-center">
              <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Step {index + 1}</span>
              <h3 className="font-heading text-base font-medium">{title}</h3>
              <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
