"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Đăng nhập thất bại");
        return;
      }

      toast.success("Đăng nhập thành công");
      router.push("/");
      router.refresh();
    });
  });

  return (
    <section className="flex w-full max-w-[400px] flex-col items-center gap-8 py-4">
      <header className="w-full space-y-3 text-center">
        <h1 className="text-[30px] font-bold tracking-[-0.04em] text-[#191c1e]">Chào mừng bạn quay lại 👋</h1>
        <p className="text-base font-medium leading-[1.625] text-[#424754]">
          Sẵn sàng học hôm nay chưa? Không gian học từ vựng của bạn
          <br />
          đang chờ bạn tiếp tục.
        </p>
      </header>

      <div className="w-full rounded-[12px] border border-black/5 bg-white px-8 pb-8 pt-10 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-sm font-semibold text-[#424754]">
              Email hoặc tên đăng nhập
            </Label>
            <Input
              id="identifier"
              autoComplete="username"
              className="h-12 rounded-[12px] border-[#0058be66] bg-[#e0e3e5] px-4 text-base text-[#191c1e] shadow-none placeholder:text-[#6b7280]"
              placeholder="scholar@lexismint.com"
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier ? (
              <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.identifier.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-[#424754]">
              Mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="password"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                className="h-12 rounded-[12px] border-[#0058be66] bg-[#e0e3e5] px-4 pr-12 text-base text-[#191c1e] shadow-none placeholder:text-[#6b7280]"
                placeholder="••••••••"
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#424754] transition-colors hover:text-[#191c1e]"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-sm text-[color:var(--danger)]">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-[12px] bg-[linear-gradient(135deg,#0a67df_0%,#0058be_52%,#004796_100%)] text-base font-semibold text-white shadow-[0_18px_38px_rgba(0,88,190,0.26)] hover:bg-[linear-gradient(135deg,#0a67df_0%,#0058be_52%,#004796_100%)] hover:opacity-95"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4 opacity-90" />}
            Đăng nhập
          </Button>
        </form>
      </div>

      <p className="text-center text-base font-medium leading-6 text-[#424754]">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-[color:var(--primary-strong)]">
          Đăng ký
        </Link>
      </p>
    </section>
  );
}
