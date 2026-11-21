import { requireStaff } from "@/features/auth/current-staff";
import { BannerForm } from "@/features/content/forms";
import { listAllCategories } from "@/server/categories/categories";
import { getBanner } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function EditBannerPage({
  params,
}: PageProps<"/home-screen/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Home screen" />;
  const [banner, categories] = await Promise.all([
    getBanner(actor, (await params).id),
    listAllCategories(),
  ]);

  return (
    <>
      <PageHeader title={banner.title} />
      <BannerForm key={banner.id} banner={banner} categories={categories} />
    </>
  );
}
