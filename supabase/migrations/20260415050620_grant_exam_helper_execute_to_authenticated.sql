grant execute on function private.can_manage_exam(uuid, uuid) to authenticated;
grant execute on function private.can_edit_exam_questions(uuid, uuid) to authenticated;
grant execute on function private.can_read_exam(uuid, uuid) to authenticated;
grant execute on function private.can_take_exam(uuid, uuid) to authenticated;
