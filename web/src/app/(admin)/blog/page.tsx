import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { listPosts } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { formatDate } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";

export default async function BlogPage() {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Blog" />;
  const posts = await listPosts(actor);

  return (
    <>
      <PageHeader
        title="Blog"
        description="Posts for buyers and sellers, read in the app."
      >
        <Link href="/blog/new" className={buttonClass("primary")}>
          Add post
        </Link>
      </PageHeader>
      {posts.length === 0 ? (
        <EmptyState>No post yet.</EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Post</th>
              <th className="end">Published</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="wide">
                  <Link
                    href={`/blog/${post.id}`}
                    className="font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span className="text-small text-muted line-clamp-1 block max-w-[70ch]">
                    {post.excerpt}
                  </span>
                </td>
                <td className="end whitespace-nowrap">
                  {post.published && post.publishedAt ? (
                    formatDate(post.publishedAt)
                  ) : (
                    <Pill>Draft</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
