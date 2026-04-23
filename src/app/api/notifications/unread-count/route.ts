import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserUnreadNotificationCount } from "@/server/repositories/notifications-repository";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    const unreadCount = await getCurrentUserUnreadNotificationCount();

    return NextResponse.json({
      unreadCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to load unread notifications count.",
      },
      { status: 500 },
    );
  }
}
