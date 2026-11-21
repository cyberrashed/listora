import { requireStaff } from "@/features/auth/current-staff";
import { FieldForm } from "@/features/categories/field-form";
import { listAllCategories } from "@/server/categories/categories";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewFieldPage() {
  const actor = await requireStaff();
  if (!can(actor, "categories.manage")) return <NoAccess title="New field" />;

  return (
    <>
      <PageHeader
        title="New field"
        description="A detail sellers add to listings in the categories you choose."
      />
      <FieldForm categories={await listAllCategories()} />
    </>
  );
}
