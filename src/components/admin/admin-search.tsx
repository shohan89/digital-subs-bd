"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { getVisibleAdminNav } from "@/constants/admin-nav";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/user";

/**
 * Quick-nav search over the admin sections a caller's role can actually reach — not a search over
 * products/orders/customers data, which has no cross-entity search backend at this layer. Keeping
 * scope to navigation avoids a header search box that silently returns nothing for real queries.
 */
export function AdminSearch({ role }: { role: UserRole }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const router = useRouter();

  const items = getVisibleAdminNav(role);
  const results = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function navigateTo(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && results[activeIndex]) {
      event.preventDefault();
      navigateTo(results[activeIndex].href);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-label="Search admin sections"
        placeholder="Search sections…"
        className="h-9 pl-8"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Matching admin sections"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">No matching section.</li>
          ) : (
            results.map((item, index) => (
              <li key={item.href} id={`${listboxId}-option-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                    index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigateTo(item.href)}
                >
                  <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
