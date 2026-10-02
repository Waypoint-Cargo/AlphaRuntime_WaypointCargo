import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import IconInput from "./IconInput";

export default function PasswordInput(props) {
    const [show, setShow] = useState(false);

    return (
        <IconInput icon={Lock} type={show ? "text" : "password"} className="pr-12" {...props}>
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-forest"
            >
                {show ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
        </IconInput>
    );
}