import { requireStaff } from "@/features/auth/current-staff";
import { BannerForm } from "@/features/content/forms";
import { listAllCategories } from "@/server/categories/categories";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewBannerPage() {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Home screen" />;
  const categories = await listAllCategories();

  return (
    <>
      <PageHeader title="Add banner" />
      <BannerForm categories={categories} />
    </>
  );
}
