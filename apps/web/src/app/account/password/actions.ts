"use server";

import { authPasswordErrorMessage, newPasswordError } from "@/lib/auth/password";
import { requireStaff } from "@/lib/auth/staff";
import { userDb } from "@/lib/server/user-db";

export type ChangePasswordState = { ok?: boolean; error?: string } | null;

/** 登入者（管理員／供應商）變更自己的密碼。密碼不寫 log、不回傳。 */
export async function changePassword(_prev: ChangePasswordState, fd: FormData): Promise<ChangePasswordState> {
  await requireStaff();
  const password = fd.get("password");
  const err = newPasswordError(password, fd.get("confirm"));
  if (err) return { error: err };
  const db = await userDb();
  const { error } = await db.auth.updateUser({ password: password as string });
  if (error) {
    console.warn("[account] updateUser password:", error.status, error.code);
    return { error: authPasswordErrorMessage(error.code) };
  }
  return { ok: true };
}
