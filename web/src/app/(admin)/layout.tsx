import Link from "next/link";
import { Suspense } from "react";
import { Account } from "@/features/shell/account";
import { MobileMenu } from "@/features/shell/mobile-menu";
import { SearchForm } from "@/features/shell/search-form";
import { SidebarNav } from "@/features/shell/sidebar-nav";
import { Mark } from "@/ui/mark";

// The frame: sidebar and top bar share one tinted ground, and the page sits
// on a white sheet inset from the window's right and bottom edges.
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-svh">
      <header className="bg-ground sticky top-0 z-10 flex h-12 items-center px-1 lg:px-5">
        <MobileMenu>
          <SearchForm className="mb-3 px-2" />
          <SidebarNav />
        </MobileMenu>
        <Link
          href="/"
          className="text-section flex items-center gap-2 font-semibold"
        >
          <Mark />
          Listora
        </Link>
        <SearchForm className="absolute left-1/2 hidden w-[548px] max-w-[40vw] -translate-x-1/2 lg:block" />
        <div className="ml-auto pr-3 lg:pr-0">
          <Suspense fallback={<div className="h-8 w-32" />}>
            <Account />
          </Suspense>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="sticky top-12 hidden h-[calc(100svh-3rem)] overflow-y-auto px-3 pb-3 lg:block">
          <SidebarNav />
        </aside>
        <main className="bg-surface border-line min-h-[calc(100svh-3rem)] p-4 lg:mr-2 lg:mb-2 lg:min-h-[calc(100svh-3.5rem)] lg:rounded-sheet lg:border lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
