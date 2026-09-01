import { BadgePercent, Headset, ShieldCheck, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";

const REASONS = [
  {
    title: "Instant Delivery",
    description: "Get your account details automatically, minutes after payment confirmation.",
    icon: Zap,
  },
  {
    title: "Verified Accounts",
    description: "Every subscription is sourced and checked before it reaches you.",
    icon: ShieldCheck,
  },
  {
    title: "Affordable Pricing",
    description: "Premium digital services at a fraction of the official retail price.",
    icon: BadgePercent,
  },
  {
    title: "Customer Support",
    description: "Real humans on WhatsApp, ready to help before and after your purchase.",
    icon: Headset,
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle
          eyebrow="Why Digital Subs BD"
          title="Built for trust, priced for value"
          align="center"
          className="items-center"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ title, description, icon: Icon }, index) => (
            <Reveal key={title} delay={index * 0.06}>
              <Card className="h-full gap-3 p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-base font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
