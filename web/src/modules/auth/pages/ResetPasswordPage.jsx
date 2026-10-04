import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, LinkIcon } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";
import { tokenService } from "@/services/tokenService";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { ROUTES } from "@/constants/app.constants";
import AuthLayout, { Logo } from "../components/AuthLayout";
import FormAlert from "../components/FormAlert";
import PasswordInput from "../components/PasswordInput";
import PasswordStrength from "../components/PasswordStrength";
import { useResetPasswordMutation } from "../api/authApi";
import { logout } from "../slices/authSlice";
import { resetPasswordSchema } from "../validation/auth.schemas";

function StatusScreen({ icon: Icon, tone, title, children, linkTo, linkLabel }) {
    return (
        <AuthLayout>
            <div className="flex flex-col items-center text-center">
                <div className={`mb-4 grid size-14 place-items-center rounded-2xl ${tone}`}>
                    <Icon className="size-7" />
                </div>
                <h1 className="text-3xl font-extrabold text-forest">{title}</h1>
                <p className="mt-2 text-sm text-ink-secondary">{children}</p>

                <Link
                    to={linkTo}
                    className="mt-8 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
                >
                    {linkLabel}
                </Link>
            </div>
        </AuthLayout>
    );
}

// Opened from the link in the password-reset email: /reset-password?token=...
export default function ResetPasswordPage() {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [resetPassword] = useResetPasswordMutation();
    const [serverError, setServerError] = useState("");
    const [done, setDone] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),
        mode: "onTouched",
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const newPassword = useWatch({ control, name: "newPassword" });

    const onSubmit = async (values) => {
        setServerError("");

        const result = await resetPassword({ token, newPassword: values.newPassword });

        if (result.error) {
            setServerError(getApiErrorMessage(result.error, "Unable to reset your password. Please try again."));
            return;
        }

        // The backend revoked every session of this user. If this browser was signed in,
        // drop the now-dead local session so nothing keeps using it.
        tokenService.clearToken();
        dispatch(logout());
        setDone(true);
    };

    if (!token) {
        return (
            <StatusScreen
                icon={LinkIcon}
                tone="bg-error-light text-error"
                title="Invalid reset link"
                linkTo={ROUTES.FORGOT_PASSWORD}
                linkLabel="Request a new link"
            >
                This password reset link is missing its token. Request a new one to continue.
            </StatusScreen>
        );
    }

    if (done) {
        return (
            <StatusScreen
                icon={CheckCircle2}
                tone="bg-success-light text-success"
                title="Password updated"
                linkTo={ROUTES.LOGIN}
                linkLabel="Back to Sign In"
            >
                Your password has been reset. Please sign in with your new password.
            </StatusScreen>
        );
    }

    return (
        <AuthLayout>
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 lg:hidden">
                    <Logo />
                </div>
                <div className="mb-4 hidden size-14 place-items-center rounded-2xl bg-forest text-gold lg:grid">
                    <KeyRound className="size-7" />
                </div>
                <h1 className="text-3xl font-extrabold text-forest">Set a new password</h1>
                <p className="mt-2 text-sm text-ink-secondary">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {serverError && (
                    <FormAlert>
                        {serverError}{" "}
                        <Link to={ROUTES.FORGOT_PASSWORD} className="font-semibold underline">
                            Request a new link
                        </Link>
                    </FormAlert>
                )}

                <div>
                    <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-forest">
                        New password
                    </label>
                    <PasswordInput
                        id="newPassword"
                        placeholder="Create a new password"
                        autoComplete="new-password"
                        error={errors.newPassword}
                        {...register("newPassword")}
                    />
                    {errors.newPassword && <p className="mt-1 text-xs text-error">{errors.newPassword.message}</p>}
                    <PasswordStrength password={newPassword} />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-forest">
                        Confirm password
                    </label>
                    <PasswordInput
                        id="confirmPassword"
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        error={errors.confirmPassword}
                        {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-error">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-60"
                >
                    {isSubmitting ? "Updating..." : "Reset Password"}
                </button>
            </form>
        </AuthLayout>
    );
}
