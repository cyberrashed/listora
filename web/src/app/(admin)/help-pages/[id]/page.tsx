import { requireStaff } from "@/features/auth/current-staff";
import { deletePageAction } from "@/features/content/actions";
import { PageForm } from "@/features/content/forms";
import { getPage } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { RowAction } from "@/ui/row-action";

export default async function EditHelpPage({
  params,
}: PageProps<"/help-pages/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Help pages" />;
  const page = await getPage(actor, (await params).id);

  return (
    <>
      <PageHeader title={page.title}>
        <RowAction
          action={deletePageAction}
          fields={{ id: page.id }}
          label="Delete"
          danger
        />
      </PageHeader>
      <PageForm key={page.id} page={page} kind={page.kind} />
    </>
  );
}
