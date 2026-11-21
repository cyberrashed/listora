import { requireStaff } from "@/features/auth/current-staff";
import { PageForm } from "@/features/content/forms";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewHelpPage({
  searchParams,
}: PageProps<"/help-pages/new">) {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Help pages" />;
  const kind = (await searchParams).kind === "page" ? "page" : "faq";

  return (
    <>
      <PageHeader title={kind === "faq" ? "Add question" : "Add page"} />
      <PageForm kind={kind} />
    </>
  );
}
