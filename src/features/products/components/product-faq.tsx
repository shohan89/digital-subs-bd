import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { SectionTitle } from "@/components/shared/section-title";
import { buildFaqJsonLd } from "@/lib/json-ld";

/**
 * Templated with the product name, not fetched from Supabase — there's no per-product FAQ table
 * (same reasoning as `CategoryFaq`, `features/categories/components/category-faq.tsx`).
 */
function getProductFaqs(productName: string) {
  return [
    {
      question: `Is this ${productName} account genuine?`,
      answer: `Yes. Every ${productName} subscription we sell is sourced through legitimate channels and verified before delivery — you get a real, working account, not a shared or cracked login.`,
    },
    {
      question: "How fast will I receive my account details?",
      answer: "Most orders are delivered within minutes of payment confirmation — you'll see your access details in your dashboard as soon as the order is marked complete.",
    },
    {
      question: `Can I renew my ${productName} subscription?`,
      answer: "Yes — once your subscription is close to expiring, you can renew it from your dashboard for the same or a different duration.",
    },
    {
      question: "What if it stops working?",
      answer: "Contact our support team on WhatsApp with your order number and we'll replace or fix your access, no questions asked, within the coverage period.",
    },
  ];
}

export function ProductFaq({ productName }: { productName: string }) {
  const faqs = getProductFaqs(productName);
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
