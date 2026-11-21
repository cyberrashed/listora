import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { listPages } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";

export default async function HelpPagesPage() {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Help pages" />;

  const pages = await listPages(actor);
  const sections = [
    {
      kind: "faq",
      title: "Questions",
      add: "Add question",
      items: pages.filter((row) => row.kind === "faq"),
    },
    {
      kind: "page",
      title: "Pages",
      add: "Add page",
      items: pages.filter((row) => row.kind === "page"),
    },
  ];

  return (
    <>
      <PageHeader
        title="Help pages"
        description="What the app's Help screen shows: common questions first, then pages like the terms and the safety tips."
      />
      <div className="grid max-w-[900px] gap-10">
        {sections.map((section) => (
          <section key={section.kind}>
            <div className="mb-2 flex items-end justify-between gap-4">
              <h2 className="text-section font-medium">{section.title}</h2>
              <Link
                href={`/help-pages/new?kind=${section.kind}`}
                className={buttonClass("secondary")}
              >
                {section.add}
              </Link>
            </div>
            {section.items.length === 0 ? (
              <EmptyState>None yet.</EmptyState>
            ) : (
              <ul className="divide-rule border-line divide-y border-y">
                {section.items.map((page) => (
                  <li
                    key={page.id}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <Link
                      href={`/help-pages/${page.id}`}
                      className="font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                    <span className="text-small text-muted flex items-center gap-2">
                      {!page.published && <Pill>Draft</Pill>}
                      {section.kind === "page" && `/${page.slug}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
