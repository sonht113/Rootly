"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUserAction } from "@/features/auth/actions/register";
import { getAvatarFallback } from "@/lib/utils/avatar";
import { registerSchema } from "@/lib/validations/auth";

type RegisterFormValues = z.input<typeof registerSchema>;

const footerLinks = [
  { href: "/privacy-policy", label: "Chính sách riêng tư" },
  { href: "/terms-of-service", label: "Điều khoản sử dụng" },
  { href: "/help-center", label: "Trung tâm trợ giúp" },
];

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const watchedFullName = useWatch({
    control: form.control,
    name: "fullName",
  });
  const watchedUsername = useWatch({
    control: form.control,
    name: "username",
  });

  const normalizedFullName = watchedFullName?.trim() ?? "";
  const normalizedUsername = watchedUsername?.trim() ?? "";

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", values.fullName);
      formData.set("username", values.username);
      formData.set("email", values.email ?? "");
      formData.set("password", values.password);

      const response = await registerUserAction(formData);
      if (response && !response.success) {
        toast.error(response.message);
      }
    });
  });

  return (
    <section className="flex w-full max-w-[480px] flex-col items-center gap-8 py-4">
      <header className="w-full space-y-2 text-center">
        <h1 className="text-[2rem] font-black tracking-[-0.04em] text-[color:var(--foreground)]">Rootly</h1>
        <p className="text-base font-medium text-[#424754]">Bắt đầu hành trình học tiếng Anh của bạn ngay hôm nay.</p>
      </header>

      <div className="w-full rounded-[32px] border border-black/5 bg-white px-6 py-10 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:px-10">
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4 text-center">
            <div className="relative inline-flex">
              <Avatar className="size-24 border-4 border-white bg-[#e6e8ea] shadow-[0_18px_40px_rgba(37,99,235,0.14)]">
                <AvatarFallback className="bg-[#e6e8ea] text-3xl font-semibold text-[color:var(--foreground)]">
                  {getAvatarFallback(normalizedFullName || normalizedUsername)}
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[color:var(--primary-strong)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]"
              >
                <ImagePlus className="size-4" />
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--primary-strong)]">
              Tên hiển thị từ Họ và Tên
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold text-[#424754]">
                Họ và Tên
              </Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#727785]" />
                <Input
                  id="fullName"
                  autoComplete="name"
                  className="h-[52px] rounded-[14px] border-transparent bg-[#f2f4f6] pl-12 pr-4 text-base shadow-none placeholder:text-[#727785]"
                  placeholder="Nguyễn Văn An"
                  {...form.register("fullName")}
                />
              </div>
              {form.formState.errors.fullName ? (
                <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.fullName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-[#424754]">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#727785]" />
                <Input
                  id="username"
                  autoComplete="username"
                  className="h-[52px] rounded-[14px] border-transparent bg-[#f2f4f6] pl-12 pr-4 text-base shadow-none placeholder:text-[#727785]"
                  placeholder="lexis_scholar"
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username ? (
                <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-[#424754]">
                Địa chỉ email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#727785]" />
                <Input
                  id="email"
                  autoComplete="email"
                  className="h-[52px] rounded-[14px] border-transparent bg-[#f2f4f6] pl-12 pr-4 text-base shadow-none placeholder:text-[#727785]"
                  placeholder="hello@example.com"
                  {...form.register("email")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-[#424754]">
                Mật khẩu
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#727785]" />
                <Input
                  id="password"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  className="h-[52px] rounded-[14px] border-transparent bg-[#f2f4f6] pl-12 pr-12 text-base shadow-none placeholder:text-[#727785]"
                  placeholder="Ít nhất 8 ký tự"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#727785] transition-colors hover:text-[color:var(--foreground)]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium leading-4 text-[#424754]">
                <CheckCircle2 className="size-4 shrink-0 text-[color:var(--success-strong)]" />
                <span>Dùng ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và một chữ số.</span>
              </div>
              {form.formState.errors.password ? (
                <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-[14px] bg-[color:var(--primary-strong)] text-base shadow-[0_18px_40px_rgba(37,99,235,0.28)] hover:bg-[#0b63d8]"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Tạo tài khoản
            </Button>

            <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#727785]">
              <span className="h-px flex-1 bg-[#c2c6d6]" />
              <span>HOẶC</span>
              <span className="h-px flex-1 bg-[#c2c6d6]" />
            </div>

            <p className="text-center text-sm font-medium text-[#424754]">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-semibold text-[color:var(--primary-strong)]">
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#727785]">
        {footerLinks.map((link, index) => (
          <div key={link.href} className="flex items-center gap-3">
            {index > 0 ? <span className="size-1 rounded-full bg-[#c2c6d6]" /> : null}
            <Link href={link.href} className="transition-colors hover:text-[color:var(--foreground)]">
              {link.label}
            </Link>
          </div>
        ))}
      </nav>
    </section>
  );
}
