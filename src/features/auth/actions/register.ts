"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { usernameToInternalEmail } from "@/lib/auth/username";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/auth";

export async function registerUserAction(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Thông tin đăng ký chưa hợp lệ.",
    };
  }

  const { fullName, username, email, password } = parsed.data;
  const internalEmail = usernameToInternalEmail(username);

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username,
      contact_email: email || null,
      role: "student",
    },
  });

  if (createError || !createdUser.user) {
    return {
      success: false,
      message: createError?.message ?? "Không thể tạo tài khoản mới.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });

  if (signInError) {
    return {
      success: false,
      message: signInError.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
