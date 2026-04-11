import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập cần ít nhất 3 ký tự")
    .max(24, "Tên đăng nhập tối đa 24 ký tự")
    .regex(/^[a-zA-Z0-9._-]+$/, "Chỉ dùng chữ, số, dấu chấm, gạch ngang hoặc gạch dưới"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
  password: z
    .string()
    .min(8, "Mật khẩu cần ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu cần ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số"),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Nhập email hoặc tên đăng nhập"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
