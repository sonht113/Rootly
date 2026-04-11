insert into public.profiles (
  auth_user_id,
  username,
  email,
  avatar_url,
  role,
  created_at,
  updated_at
)
select
  auth_user.id,
  coalesce(nullif(auth_user.raw_user_meta_data ->> 'username', ''), split_part(auth_user.email, '@', 1)),
  nullif(auth_user.raw_user_meta_data ->> 'contact_email', ''),
  nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
  case
    when coalesce(nullif(auth_user.raw_user_meta_data ->> 'role', ''), 'student') in ('student', 'teacher', 'admin') then
      coalesce(nullif(auth_user.raw_user_meta_data ->> 'role', ''), 'student')::app_role
    else 'student'::app_role
  end,
  coalesce(auth_user.created_at, now()),
  now()
from auth.users as auth_user
left join public.profiles as profile on profile.auth_user_id = auth_user.id
where profile.auth_user_id is null
on conflict (auth_user_id) do update
set
  username = excluded.username,
  email = excluded.email,
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  role = excluded.role,
  updated_at = now();
