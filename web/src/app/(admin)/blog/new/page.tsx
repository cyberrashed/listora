import { requireStaff } from "@/features/auth/current-staff";
import { PostForm } from "@/features/content/forms";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewPostPage() {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Blog" />;

  return (
    <>
      <PageHeader title="Add post" />
      <PostForm />
    </>
  );
}
