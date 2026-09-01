import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { SectionTitle } from "@/components/shared/section-title";
import { siteConfig } from "@/constants/site";
import { buildFaqJsonLd } from "@/lib/json-ld";

/**
 * There's no per-category FAQ content in Supabase (no table for it, and none was asked for) —
 * these questions are templated with the category name so they read as genuinely relevant to the
 * page they're on, not copy-pasted boilerplate. If categories ever need real editorial FAQ
 * content, that's a `category_faqs` table + admin UI to add deliberately, not a retrofit here.
 */
function getCategoryFaqs(categoryName: string) {
  return [
    {
      question: `Are ${categoryName} subscriptions from ${siteConfig.name} genuine?`,
      answer: `Yes. Every ${categoryName} product we sell is sourced through legitimate channels and verified before delivery — you get a real, working account, not a shared or cracked login.`,
    },
    {
      question: `How fast will I get access to my ${categoryName} subscription?`,
      answer: "Most orders are delivered within minutes of payment confirmation — you'll see your access details in your dashboard as soon as the order is marked complete.",
    },
    {
      question: "What payment methods can I use?",
      answer: "We support bKash, Nagad, Rocket, and card payments — whichever is most convenient for you.",
    },
    {
      question: `What if I have an issue with my ${categoryName} subscription?`,
      answer: "Contact our support team on WhatsApp with your order number and we'll replace or fix your access, no questions asked, within the coverage period.",
    },
  ];
}

export function CategoryFaq({ categoryName }: { categoryName: string }) {
  const faqs = getCategoryFaqs(categoryName);
  const faqJsonLd = buildFaqJsonLd(faqs);

  return (
    <section className="py-16 sm:py-20">
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <Container size="narrow" className="flex flex-col gap-10">
        <SectionTitle eyebrow="FAQ" title="Frequently asked questions" align="center" className="items-center" />

        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
