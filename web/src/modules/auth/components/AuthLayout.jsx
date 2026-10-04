import { Leaf, ShoppingBag, Cpu } from "lucide-react";
import loginBg from "../../../assets/login_bg.png";

const BRANDS = [
    { name: "FRESH", sub: "Grocery & Perishables", icon: Leaf, tile: "bg-gold text-forest" },
    { name: "STYLE", sub: "Fashion & Apparel", icon: ShoppingBag, tile: "bg-gold text-forest" },
    { name: "TECH", sub: "Electronics & Innovation", icon: Cpu, tile: "bg-forest text-gold ring-1 ring-white/20" },
];

export function Logo({ light = false }) {
    return (
        <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gold text-xl font-black text-forest">W</div>
            <div className="leading-none">
                <p className={`text-2xl font-extrabold tracking-wide ${light ? "text-white" : "text-forest"}`}>
                    WAYPOINT
                </p>
                <p className="mt-1 text-xs tracking-[0.3em] text-gold">GROUP</p>
            </div>
        </div>
    );
}

export default function AuthLayout({ children }) {
    return (
        <div className="grid min-h-screen bg-surface lg:grid-cols-2">
            {/* Left: brand panel (hidden on small screens) */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest p-14 lg:flex">
                <img src={loginBg} alt="" className="absolute inset-0 size-full object-cover object-[68%_center]" />
                {/* dark at the top and bottom so the logo and text stay readable over the photo */}
                <div className="absolute inset-0 bg-linear-to-b from-forest/85 via-forest/20 to-forest/90" />
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-forest/95 via-forest/70 to-transparent" />

                <div className="relative z-10">
                    <Logo light />
                </div>

                <div className="relative z-10">
                    <div className="mb-8 h-1 w-12 rounded bg-gold" />
                    <h2 className="text-5xl font-extrabold leading-tight text-white">
                        Smarter Deliveries.
                        <br />
                        Stronger Stores.
                    </h2>
                    <p className="mt-5 text-white/80">A unified delivery platform system for Waypoint Group.</p>

                    <ul className="mt-8 space-y-3">
                        {BRANDS.map(({ name, sub, icon: Icon, tile }) => (
                            <li
                                key={name}
                                className="flex w-60 items-center gap-3 rounded-lg bg-white/10 pr-3 backdrop-blur"
                            >
                                <span className={`grid size-9 place-items-center rounded-lg ${tile}`}>
                                    <Icon className="size-4" />
                                </span>
                                <span className="leading-tight">
                                    <span className="block text-[11px] tracking-widest text-white/70">
                                        WAYPOINT <b className="text-gold">{name}</b>
                                    </span>
                                    <span className="block text-[10px] text-white/50">{sub}</span>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-8 text-xs text-white/60">© 2026 Waypoint Group. All rights reserved.</p>
                </div>
            </aside>

            {/* Right: whatever page we put inside */}
            <main className="flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-120">{children}</div>
            </main>
        </div>
    );
}