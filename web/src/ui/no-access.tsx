import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

export function NoAccess({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState>
        Your role doesn&apos;t include this section. Ask an owner if you need
        it.
      </EmptyState>
    </>
  );
}
