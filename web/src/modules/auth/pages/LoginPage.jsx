import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { ROUTES } from "@/constants/app.constants";
import AuthLayout, { Logo } from "../components/AuthLayout";
import FormAlert from "../components/FormAlert";
import IconInput from "../components/IconInput";
import PasswordInput from "../components/PasswordInput";
import { useLoginMutation } from "../api/authApi";
import { selectSessionExpired } from "../slices/authSlice";
import { loginSchema } from "../validation/auth.schemas";

export default function LoginPage() {
    const [login] = useLoginMutation();
    const sessionExpired = useAppSelector(selectSessionExpired);
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
        mode: "onTouched",
        defaultValues: { identifier: "", password: "" },
    });

    const onSubmit = async (values) => {
        setServerError("");

        const result = await login({ identifier: values.identifier, password: values.password });

        if (result.error) {
            setServerError(getApiErrorMessage(result.error, "Unable to sign in. Please try again."));
            resetField("password");
        }
        // On success the auth state now holds the user and <GuestRoute> redirects
        // to the right dashboard for their role — nothing to do here.
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
                {sessionExpired && !serverError && (
                    <FormAlert type="info">Your session has expired. Please sign in again.</FormAlert>
                )}
                {serverError && <FormAlert>{serverError}</FormAlert>}

                <div>
                    <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-forest">
                        Employee Number or Email
                    </label>
                    <IconInput
                        id="identifier"
                        icon={User}
                        placeholder="man_001 or you@company.com"
                        autoComplete="username"
                        error={errors.identifier}
                        {...register("identifier")}
                    />
                    {errors.identifier && <p className="mt-1 text-xs text-error">{errors.identifier.message}</p>}
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-forest">
                            Password
                        </label>
                        <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-semibold text-brand hover:underline">
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
                    <Link to={ROUTES.REGISTER} className="font-semibold text-brand hover:underline">
                        Create Account
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
