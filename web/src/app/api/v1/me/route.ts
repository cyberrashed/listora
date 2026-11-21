import { parseBody, requireUser, route } from "@/server/http";
import { toUserDto } from "@/server/users/user.model";
import {
  accountDeletion,
  deleteAccount,
  profileUpdate,
  updateProfile,
} from "@/server/users/users";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  return Response.json(toUserDto(user));
});

export const PATCH = route(async (request) => {
  const user = await requireUser(request);
  const input = await parseBody(request, profileUpdate);
  return Response.json(await updateProfile(user, input));
});

export const DELETE = route(async (request) => {
  const user = await requireUser(request);
  const { password } = await parseBody(request, accountDeletion);
  await deleteAccount(user, password);
  return new Response(null, { status: 204 });
});
