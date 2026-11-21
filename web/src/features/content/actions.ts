"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  announcementInput,
  bannerInput,
  deleteBanner,
  deletePage,
  deletePost,
  moveBanner,
  pageInput,
  postInput,
  saveBanner,
  savePage,
  savePost,
  sendAnnouncement,
} from "@/server/content/content";
import { settingsInput, updateSettings } from "@/server/settings/settings";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

const idOf = (formData: FormData) => String(formData.get("id") ?? "") || null;

export async function saveBannerAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "title", "body", "link", "target", "active");
  const input = bannerInput.safeParse({
    ...values,
    active: values.active === "on",
  });
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await saveBanner(actor, idOf(formData), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/home-screen");
}

export async function moveBannerAction(formData: FormData) {
  const actor = await requireStaff();
  await moveBanner(
    actor,
    String(formData.get("id")),
    formData.get("direction") === "up" ? -1 : 1,
  );
  refresh();
}

export async function deleteBannerAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deleteBanner(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  refresh();
}

export async function savePageAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "kind", "title", "slug", "body", "published");
  const input = pageInput.safeParse({
    ...values,
    published: values.published === "on",
  });
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await savePage(actor, idOf(formData), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/help-pages");
}

export async function deletePageAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deletePage(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  redirect("/help-pages");
}

export async function savePostAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(
    formData,
    "title",
    "slug",
    "excerpt",
    "body",
    "published",
  );
  const input = postInput.safeParse({
    ...values,
    published: values.published === "on",
  });
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await savePost(actor, idOf(formData), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/blog");
}

export async function deletePostAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deletePost(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  redirect("/blog");
}

export async function sendAnnouncementAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "title", "body", "email");
  const input = announcementInput.safeParse(values);
  if (!input.success) return { ...invalid(input.error), values };

  try {
    const count = await sendAnnouncement(actor, input.data);
    refresh();
    return {
      saved: true,
      message: `Sent to ${count === 1 ? "1 customer" : `${count} customers`}.`,
    };
  } catch (error) {
    return { ...failed(error), values };
  }
}

export async function saveSettingsAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(
    formData,
    "freeListingsPerMonth",
    "maintenance",
    "maintenanceMessage",
    "minAppVersion",
    "supportEmail",
  );
  const input = settingsInput.safeParse({
    ...values,
    freeListingsPerMonth: values.freeListingsPerMonth.trim()
      ? Number(values.freeListingsPerMonth)
      : NaN,
    maintenance: values.maintenance === "on",
  });
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await updateSettings(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  refresh();
  // The form shows what was saved straight away, not the page from before
  // the refresh arrives.
  return { saved: true, values };
}
