import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShopSearchBarProps = {
  defaultValue?: string;
  /** Current filter/sort state to preserve when a search is submitted — a search shouldn't reset them. */
  hiddenParams?: Record<string, string | undefined>;
};

export function ShopSearchBar({ defaultValue, hiddenParams = {} }: ShopSearchBarProps) {
  return (
    <form method="get" role="search" className="flex gap-2">
      {Object.entries(hiddenParams).map(
        ([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <Input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search Netflix, Canva, ChatGPT…"
        aria-label="Search products"
        className="h-10"
      />
      <Button type="submit" size="icon" className="h-10 w-10 shrink-0" aria-label="Search">
        <Search className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
