import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "../src/lib/supabase/env";

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const fileName of envFiles) {
    const filePath = path.join(process.cwd(), fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

const env = getServerEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const [authUsers, { data: profiles, error: profilesError }] = await Promise.all([
    listAllAuthUsers(),
    supabase.from("profiles").select("auth_user_id, username"),
  ]);

  if (profilesError) {
    throw profilesError;
  }

  const profileIds = new Set((profiles ?? []).map((profile) => profile.auth_user_id));
  const missingProfiles = authUsers
    .filter((user) => !profileIds.has(user.id))
    .map((user) => ({
      id: user.id,
      email: user.email,
      username: (user.user_metadata?.username as string | undefined) ?? null,
    }));

  console.log(
    JSON.stringify(
      {
        authUsers: authUsers.length,
        profiles: profiles?.length ?? 0,
        missingProfiles,
      },
      null,
      2,
    ),
  );

  if (missingProfiles.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
