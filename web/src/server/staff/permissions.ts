// Every permission a role can hold. The owner role holds all of them without
// listing any.
export const permissions = {
  "categories.manage": "Edit categories and listing fields",
  "content.manage":
    "Edit banners, help pages and the blog, and send notifications",
  "customers.view": "See customers",
  "customers.manage": "Suspend and reinstate customers",
  "emails.view": "See the email log",
  "listings.review": "Review, approve and reject listings",
  "packages.manage": "Edit packages and give them to customers",
  "payments.view": "See payments",
  "reports.handle": "Handle reports from customers",
  "reviews.moderate": "Hide and restore seller reviews",
  "settings.manage": "Change how the marketplace runs",
  "team.manage": "Manage staff and roles, and read the activity log",
  "verification.review": "Approve and turn down verification requests",
} as const;

export type Permission = keyof typeof permissions;

export const permissionKeys = Object.keys(permissions) as Permission[];
