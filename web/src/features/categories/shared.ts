export const categoryTabs = [
  { href: "/categories", label: "Categories" },
  { href: "/categories/fields", label: "Listing fields" },
];

export const fieldTypeLabels = {
  text: "Text",
  number: "Number",
  select: "One choice",
  multiselect: "Several choices",
  boolean: "Yes or no",
} as const;

export type CategoryOption = { id: string; name: string; depth: number };

/** A category's name, indented to show its level in a plain select. */
export function indented({ name, depth }: CategoryOption) {
  return `${"   ".repeat(depth)}${name}`;
}
