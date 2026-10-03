import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronDown, Mail, Phone, User, Users } from "lucide-react";

import AuthLayout, { Logo } from "../components/AuthLayout";
import IconInput, { inputClasses } from "../components/IconInput";
import PasswordInput from "../components/PasswordInput";
import PasswordStrength from "../components/PasswordStrength";
import { registerAccountSchema, ROLE_OPTIONS } from "../validation/auth.schemas";

// A label on top, the input in the middle, an error message underneath
function Field({ id, label, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-forest">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
    );
}

export default function RegisterPage() {
        const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(registerAccountSchema),
        mode: "onTouched",
        defaultValues: {
            fullName: "",
            email: "",
            countryCode: "+94",
            phone: "",
            password: "",
            confirmPassword: "",
            role: "",
            terms: false,
        },
    });

    const password = useWatch({ control, name: "password" });
    const confirm = useWatch({ control, name: "confirmPassword" });
    const role = useWatch({ control, name: "role" });

    const onSubmit = async (values) => {
        const payload = {
            fullName: values.fullName,
            email: values.email,
            phone: `${values.countryCode}${values.phone}`,
            password: values.password,
            role: values.role,
        };
        // TODO: call the real register API here later
        console.log("register payload", payload);
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
                <h1 className="text-3xl font-extrabold leading-tight text-forest">
                    Create your Waypoint Cargo account
                </h1>
                <p className="mt-2 text-sm text-ink-secondary">
                    Join our logistics network and keep deliveries moving.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Field id="fullName" label="Full name" error={errors.fullName?.message}>
                    <IconInput
                        id="fullName"
                        icon={User}
                        placeholder="e.g. Tharindu Perera"
                        autoComplete="name"
                        error={errors.fullName}
                        {...register("fullName")}
                    />
                </Field>

                <Field id="email" label="Work email" error={errors.email?.message}>
                    <IconInput
                        id="email"
                        type="email"
                        icon={Mail}
                        placeholder="you@company.com"
                        autoComplete="email"
                        error={errors.email}
                        {...register("email")}
                    />
                </Field>

                <Field id="phone" label="Phone number" error={errors.phone?.message}>
                    <div className="flex">
                        <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                            <select
                                {...register("countryCode")}
                                aria-label="Country code"
                                className="h-full appearance-none rounded-l-xl border border-r-0 border-line bg-muted py-3 pl-9 pr-8 text-sm font-medium text-forest outline-none"
                            >
                                <option value="+94">+94</option>
                                <option value="+91">+91</option>
                                <option value="+44">+44</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                        </div>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            placeholder="77 123 4567"
                            autoComplete="tel-national"
                            aria-invalid={!!errors.phone}
                            {...register("phone")}
                            className={`${inputClasses} rounded-l-none pl-4 ${errors.phone ? "border-error" : ""}`}
                        />
                    </div>
                </Field>

                               <Field id="password" label="Password" error={errors.password?.message}>
                    <PasswordInput
                        id="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        error={errors.password}
                        {...register("password")}
                    />
                    <PasswordStrength password={password} />
                </Field>

                <Field
                    id="confirmPassword"
                    label="Confirm password"
                    error={!confirm ? errors.confirmPassword?.message : undefined}
                >
                    <PasswordInput
                        id="confirmPassword"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        error={errors.confirmPassword}
                        {...register("confirmPassword")}
                    />
                    {confirm && (
                        <p
                            className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                                confirm === password ? "text-success" : "text-error"
                            }`}
                        >
                            <CheckCircle2 className="size-3.5" />
                            {confirm === password ? "Passwords match" : "Passwords do not match"}
                        </p>
                    )}
                </Field>

                <Field id="role" label="Role" error={errors.role?.message}>
                    <div className="relative">
                        <Users className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                        <select
                            id="role"
                            aria-invalid={!!errors.role}
                            {...register("role")}
                            className={`${inputClasses} appearance-none pr-10 ${
                                role ? "text-forest" : "text-ink-secondary"
                            } ${errors.role ? "border-error" : ""}`}
                        >
                            <option value="" disabled>
                                Select your role
                            </option>
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                    </div>
                </Field>

                <div>
                    <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input type="checkbox" className="size-4 rounded accent-forest" {...register("terms")} />
                        <span>
                            I agree to the{" "}
                            <a href="#" className="font-semibold text-forest hover:underline">
                                Terms and Conditions
                            </a>{" "}
                            and{" "}
                            <a href="#" className="font-semibold text-forest hover:underline">
                                Privacy Policy
                            </a>
                        </span>
                    </label>
                    {errors.terms && <p className="mt-1 text-xs text-error">{errors.terms.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-forest transition hover:brightness-95 disabled:opacity-60"
                >
                    {isSubmitting ? "Creating account..." : "Create Account"}
                    {!isSubmitting && <ArrowRight className="size-4" />}
                </button>

                <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="h-px flex-1 bg-divider" />
                    or
                    <span className="h-px flex-1 bg-divider" />
                </div>

                <p className="text-center text-sm text-ink-secondary">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-forest hover:underline">
                        Sign In
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}