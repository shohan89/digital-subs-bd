import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href={ROUTES.home} className="text-sm underline">
        Back to home
      </Link>
    </main>
  );
}
