import { requireStaff } from "@/features/auth/current-staff";
import { deletePostAction } from "@/features/content/actions";
import { PostForm } from "@/features/content/forms";
import { getPost } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { RowAction } from "@/ui/row-action";

export default async function EditPostPage({
  params,
}: PageProps<"/blog/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Blog" />;
  const post = await getPost(actor, (await params).id);

  return (
    <>
      <PageHeader title={post.title}>
        <RowAction
          action={deletePostAction}
          fields={{ id: post.id }}
          label="Delete"
          danger
        />
      </PageHeader>
      <PostForm key={post.id} post={post} />
    </>
  );
}
