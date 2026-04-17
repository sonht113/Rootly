import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";
import { getRoleHomePath } from "@/lib/navigation/role-routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(getRoleHomePath(profile.role));
}
