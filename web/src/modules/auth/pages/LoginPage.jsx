import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { z } from "zod";
import { User } from "lucide-react";

import AuthLayout, { Logo } from "../components/AuthLayout";
import IconInput from "../components/IconInput";
import PasswordInput from "../components/PasswordInput";
import { loginSchema } from "../validation/auth.schemas";

// Your existing login rules + the "keep me signed in" checkbox
const loginFormSchema = loginSchema.extend({ remember: z.boolean() });

export default function LoginPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginFormSchema),
        mode: "onTouched",
        defaultValues: { username: "", password: "", remember: false },
    });

    const onSubmit = async (values) => {
        // TODO: call the real login API here later
        console.log("login payload", { username: values.username, remember: values.remember });
    };

    return (
        <AuthLayout>
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 lg:hidden">
                    <Logo />
                </div>
                <div className="mb-4 hidden size-14 place-items-center rounded-2xl bg-forest text-2xl font-black text-gold lg:grid">
                    W
                </div>
                <h1 className="text-3xl font-extrabold text-forest">Welcome back</h1>
                <p className="mt-2 text-sm text-ink-secondary">Sign in to your Waypoint account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div>
                    <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-forest">
                        Employee Number
                    </label>
                    <IconInput
                        id="username"
                        icon={User}
                        placeholder="emp_001_2026"
                        autoComplete="username"
                        error={errors.username}
                        {...register("username")}
                    />
                    {errors.username && <p className="mt-1 text-xs text-error">{errors.username.message}</p>}
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-forest">
                            Password
                        </label>
                        <Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <PasswordInput
                        id="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        error={errors.password}
                        {...register("password")}
                    />
                    {errors.password && <p className="mt-1 text-xs text-error">{errors.password.message}</p>}
                </div>

                <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input type="checkbox" className="size-4 rounded accent-brand" {...register("remember")} />
                    Keep me signed in for 30 days
                </label>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-60"
                >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </button>

                <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="h-px flex-1 bg-divider" />
                    or
                    <span className="h-px flex-1 bg-divider" />
                </div>

                <p className="text-center text-sm text-ink-secondary">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-semibold text-brand hover:underline">
                        Create Account
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}