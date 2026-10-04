import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants/app.constants";

const issueOptions = [
  { id: "missing_item", label: "Missing Item", icon: Package },
  { id: "damaged_item", label: "Damaged Item", icon: AlertTriangle },
  { id: "wrong_item", label: "Wrong Item", icon: RotateCcw },
  { id: "quantity_mismatch", label: "Quantity Mismatch", icon: Check },
  { id: "late_delivery", label: "Late Delivery", icon: Clock3 },
  { id: "other", label: "Other", icon: Plus },
];

const ISSUE_COPY = {
  missing_item: {
    title: "Missing item",
    copy: "Item(s) listed in the order were not delivered.",
  },
  damaged_item: {
    title: "Damaged item",
    copy: "Item(s) were delivered but were damaged.",
  },
  wrong_item: {
    title: "Wrong item",
    copy: "The delivered items did not match the order.",
  },
  quantity_mismatch: {
    title: "Quantity mismatch",
    copy: "The delivered quantity was different from what was ordered.",
  },
  late_delivery: {
    title: "Late delivery",
    copy: "The delivery arrived later than the expected time window.",
  },
  other: {
    title: "Other",
    copy: "Please describe the issue in more detail.",
  },
};

export default function ReportDeliveryIssuePage() {
  const [selected, setSelected] = useState("missing_item");
  const [submitted, setSubmitted] = useState(false);

  const issueTitle = useMemo(() => ISSUE_COPY[selected]?.title || "Missing item", [selected]);
  const issueText = useMemo(() => ISSUE_COPY[selected]?.copy || ISSUE_COPY.missing_item.copy, [selected]);

  return (
    <div className="mx-auto max-w-[1280px] px-1 py-1">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-0.04em] text-forest">Report Delivery Issue</h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            Report any issues with this delivery so our operations team can take action quickly.
          </p>
        </div>

        <Link
          to={ROUTES.STORE_MANAGER_ORDERS}
          className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-forest shadow-sm transition hover:border-gold"
        >
          Back to Orders
        </Link>
      </div>

      <div className="relative rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-divider pb-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-line bg-screen">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=200&q=80"
                alt="Store"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-extrabold tracking-[0.08em] text-forest">ORD-108</span>
                <span className="rounded-full bg-[#f4efe2] px-2.5 py-1 text-[11px] font-semibold text-[#9c6a14]">
                  Pending Review
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-forest">
                <PackageCheck className="size-4 text-gold" />
                Fresh Nugegoda
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
                <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> 123 High Level Road, Nugegoda, Colombo</span>
                <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> 29 Sep 2026</span>
                <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> 10:00 AM – 12:30 PM</span>
                <span className="flex items-center gap-1.5"><Truck className="size-3.5" /> Getaiko Fleet</span>
              </div>
            </div>
          </div>

          <div className="min-w-[150px] text-right text-sm text-ink-secondary">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Total items:</div>
            <div className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.05em] text-forest">18</div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Total weight:</div>
            <div className="mt-1 text-[14px] font-bold text-forest">420 kg</div>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Total volume:</div>
            <div className="mt-1 text-[14px] font-bold text-forest">3.2 m³</div>
          </div>
        </div>

        <div className="pt-6">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-forest">1. Select issue type</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {issueOptions.map(({ id, label, icon: Icon }) => {
              const active = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`flex min-h-[86px] items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-[#d7a82e] bg-[#fffaf0] shadow-[inset_0_0_0_1px_rgba(210,169,75,0.3)]"
                      : "border-line bg-surface hover:border-gold"
                  }`}
                >
                  <span className={`grid size-11 place-items-center rounded-full border ${active ? "border-[#e7c56c] bg-[#fef3cf] text-[#9a6908]" : "border-line bg-screen text-ink-secondary"}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className={`text-[15px] font-semibold ${active ? "text-forest" : "text-ink-secondary"}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface">
          <div className="border-b border-divider px-5 py-4">
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-forest">2. Issue details</h2>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-[#f0cf62] bg-[#fffaf0] px-4 py-3 text-sm text-forest">
              <span className="grid size-6 place-items-center rounded-full bg-[#f6d77c] text-[#8a5d00]">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <span className="font-bold">{issueTitle}</span>
                <span className="text-ink-secondary">: {issueText}</span>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-forest">Item *</label>
                <select className="h-12 w-full rounded-xl border border-line bg-screen px-3 text-base text-forest outline-none focus:border-gold">
                  <option>Coca-Cola 500ml (Pack of 24)</option>
                  <option>Other Item</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-forest">Received quantity *</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-line bg-screen">
                  <input defaultValue={24} className="h-12 w-full bg-transparent px-3 text-base text-forest outline-none" />
                  <span className="border-l border-line px-3 text-sm text-ink-secondary">packs</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-forest">Description *</label>
              <textarea
                rows={4}
                defaultValue="Coca-Cola 500ml (Pack of 24) was missing from the delivery. Not received."
                className="w-full rounded-xl border border-line bg-screen px-3 py-3 text-base text-forest outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-forest">Photos (optional)</label>
              <p className="mb-3 text-sm text-ink-secondary">Add photos to help us investigate the issue.</p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-dashed border-line bg-screen">
                  <img
                    src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=300&q=80"
                    alt="Issue photo"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-forest text-white"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>

                <button
                  type="button"
                  className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-line bg-screen text-ink-secondary transition hover:border-gold hover:text-forest"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="grid size-8 place-items-center rounded-full bg-surface text-forest shadow-sm">
                      <Plus className="size-4" />
                    </span>
                    <span className="text-xs font-medium">Add more</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-forest transition hover:border-gold">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-forest shadow-lg shadow-gold/25 transition hover:brightness-95"
          >
            Submit Issue →
          </button>
        </div>
      </div>

      {submitted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b2d2b]/10 p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setSubmitted(false)}
        >
          <div
            className="relative w-full max-w-[470px] rounded-[18px] border border-[#e5e8e7] bg-white p-5 pt-4 shadow-[0_22px_70px_rgba(15,29,28,0.18)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-[#667a78] transition hover:bg-screen"
              aria-label="Close success popup"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col items-center pt-2 text-center">
              <div className="mb-4 grid size-14 place-items-center rounded-full bg-[#0b3d39] text-white ring-8 ring-[#edf3f2]">
                <Check className="size-7" strokeWidth={3} />
              </div>

              <h3 className="text-[24px] font-extrabold tracking-[-0.04em] text-forest">Issue reported successfully</h3>
              <p className="mt-2 max-w-[330px] text-[14px] leading-5 text-ink-secondary">
                Your report has been sent to the Waypoint operations team. They will review the issue and contact you if more information is needed.
              </p>
            </div>

            <div className="mt-5 rounded-[12px] border border-line bg-[#f9faf9] px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667a78]">
                <span>Issue ID</span>
                <button type="button" className="grid size-7 place-items-center rounded-lg border border-line bg-white text-[#405553]" aria-label="Copy issue ID">
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-3">
                <span className="text-[19px] font-bold tracking-[0.08em] text-forest">ISS-024</span>
                <Copy className="size-4 text-[#667a78]" />
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-start gap-3 border-t border-divider pt-4">
                <div className="relative mt-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#0b3d39]" />
                  <Check className="relative size-3.5 text-white" strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-forest">Issue submitted</div>
                  <div className="text-[13px] text-[#697c7a]">29 Sep 2026, 11:24 AM</div>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-divider pt-4">
                <div className="relative mt-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-white ring-1 ring-[#b7c1bf]" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#9aa8a6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-forest">Sent to Waypoint operations team</div>
                  <div className="text-[13px] text-[#697c7a]">Our team will review and investigate.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-divider pt-4">
                <div className="relative mt-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-white ring-1 ring-[#b7c1bf]" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#9aa8a6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-forest">You will be notified</div>
                  <div className="text-[13px] text-[#697c7a]">Updates will appear in your notifications.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                to={ROUTES.STORE_MANAGER_ORDERS}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#f2be32] px-4 text-[16px] font-bold text-forest shadow-[0_6px_0_rgba(214,163,34,0.18)] transition hover:brightness-95"
              >
                Back to Orders
              </Link>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-4 text-[16px] font-semibold text-forest transition hover:border-gold"
              >
                Report Another Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
