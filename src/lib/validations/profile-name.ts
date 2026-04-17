import { z } from "zod";

const FULL_NAME_ALLOWED_PATTERN = /^[\p{L}\p{M}\s'.-]+$/u;

export function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export const fullNameSchema = z
  .string()
  .transform(normalizeFullName)
  .refine((value) => value.length >= 2, "Họ và tên cần ít nhất 2 ký tự")
  .refine((value) => value.length <= 120, "Họ và tên tối đa 120 ký tự")
  .refine((value) => /[\p{L}]/u.test(value), "Họ và tên phải chứa ít nhất một chữ cái")
  .refine(
    (value) => FULL_NAME_ALLOWED_PATTERN.test(value),
    "Họ và tên chỉ dùng chữ cái, khoảng trắng, dấu nháy, dấu chấm hoặc gạch nối",
  );
