import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";

import { getApiErrorMessage } from "@/shared/utils/apiError";
import { ROUTES } from "@/constants/app.constants";
import AuthLayout, { Logo } from "../components/AuthLayout";
import FormAlert from "../components/FormAlert";
import IconInput from "../components/IconInput";
import { useForgotPasswordMutation } from "../api/authApi";
import { forgotPasswordSchema } from "../validation/auth.schemas";

function BackToSignIn() {
    return (
        <Link
            to={ROUTES.LOGIN}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
            <ArrowLeft className="size-4" />
            Back to Sign In
        </Link>
    );
}

export default function ForgotPasswordPage() {
    // Empty = show the form. Filled = show the "check your email" message.
    const [sentTo, setSentTo] = useState("");
    const [serverError, setServerError] = useState("");
    const [forgotPassword] = useForgotPasswordMutation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onTouched",
        defaultValues: { email: "" },
    });

    const onSubmit = async (values) => {
        setServerError("");

        const result = await forgotPassword({ email: values.email });

        if (result.error) {
            // e.g. 429 after 3 requests in 15 minutes
            setServerError(getApiErrorMessage(result.error, "Unable to send the reset link. Please try again."));
            return;
        }

        // The backend answers the same way whether or not the account exists
        setSentTo(values.email);
    };

    // Screen 2: confirmation
    if (sentTo) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-success-light text-success">
                        <CheckCircle2 className="size-7" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-forest">Check your email</h1>
                    <p className="mt-2 text-sm text-ink-secondary">
                        If an account exists for
                        <br />
                        <span className="font-semibold text-forest">{sentTo}</span>
                        <br />
                        we've sent a password reset link.
                    </p>

                    <Link
                        to={ROUTES.LOGIN}
                        className="mt-8 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
                    >
                        Back to Sign In
                    </Link>

                    <p className="mt-6 text-sm text-ink-secondary">
                        Wrong email?{" "}
                        <button
                            type="button"
                            onClick={() => setSentTo("")}
                            className="font-semibold text-brand hover:underline"
                        >
                            Try again
                        </button>
                    </p>
                </div>
            </AuthLayout>
        );
    }

    // Screen 1: the form
    return (
        <AuthLayout>
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 lg:hidden">
                    <Logo />
                </div>
                <div className="mb-4 hidden size-14 place-items-center rounded-2xl bg-forest text-gold lg:grid">
                    <KeyRound className="size-7" />
                </div>
                <h1 className="text-3xl font-extrabold text-forest">Forgot your password?</h1>
                <p className="mt-2 text-sm text-ink-secondary">
                    Enter your email and we'll send you a link to reset it.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {serverError && <FormAlert>{serverError}</FormAlert>}

                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest">
                        Work email
                    </label>
                    <IconInput
                        id="email"
                        type="email"
                        icon={Mail}
                        placeholder="you@company.com"
                        autoComplete="email"
                        error={errors.email}
                        {...register("email")}
                    />
                    {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-60"
                >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>

                <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="h-px flex-1 bg-divider" />
                    or
                    <span className="h-px flex-1 bg-divider" />
                </div>

                <BackToSignIn />
            </form>
        </AuthLayout>
    );
}