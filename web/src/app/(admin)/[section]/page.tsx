import { notFound } from "next/navigation";
import { requireStaff } from "@/features/auth/current-staff";
import { navItems } from "@/features/shell/nav";
import { EmptyState } from "@/ui/empty-state";
import { PageHeader } from "@/ui/page-header";

// Stands in for every section until its own route exists. A real route at
// the same path takes precedence, so sections replace this one by one.
export default async function SectionPage({ params }: PageProps<"/[section]">) {
  await requireStaff();

  const { section } = await params;
  const item = navItems.find((candidate) => candidate.href === `/${section}`);
  if (!item) notFound();

  return (
    <>
      <PageHeader title={item.label} />
      <EmptyState>This section is not built yet.</EmptyState>
    </>
  );
}
