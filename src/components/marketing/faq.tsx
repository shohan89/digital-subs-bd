import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { buildFaqJsonLd } from "@/lib/json-ld";

const FAQS = [
  {
    question: "Are these accounts legitimate?",
    answer:
      "Yes. Every subscription we sell is sourced through legitimate channels and verified before delivery — you get a real, working account, not a shared or cracked login.",
  },
  {
    question: "How fast will I get my account details?",
    answer:
      "Most orders are delivered within minutes of payment confirmation. You'll see your access details in your dashboard as soon as the order is marked complete.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We support bKash, Nagad, Rocket, and card payments — whichever is most convenient for you.",
  },
  {
    question: "What happens if my subscription stops working?",
    answer:
      "Contact our support team on WhatsApp with your order number and we'll replace or fix your access, no questions asked, within the coverage period.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "If an account doesn't work as described and we can't resolve it, you're eligible for a refund — reach out to support and we'll take care of it.",
  },
];

export function Faq() {
  const faqJsonLd = buildFaqJsonLd(FAQS);

  return (
    <section className="py-16 sm:py-20">
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <Container size="narrow" className="flex flex-col gap-10">
        <SectionTitle eyebrow="FAQ" title="Frequently asked questions" align="center" className="items-center" />

        <Reveal>
          <Accordion type="single" collapsible>
            {FAQS.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </Container>
    </section>
  );
}
