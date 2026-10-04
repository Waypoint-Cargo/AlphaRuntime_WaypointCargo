import { CircleCheck, Package, Snowflake, TriangleAlert } from "lucide-react";

// How each delivery type looks
export const DELIVERY_TYPES = {
    dry: { label: "Dry groceries", icon: Package, tone: "pending" },
    chilled: { label: "Chilled", icon: Snowflake, tone: "info" },
    frozen: { label: "Frozen", icon: Snowflake, tone: "frozen" },
};

// How each delivery status looks
export const STATUSES = {
    confirmed: { label: "Confirmed", tone: "info" },
    in_transit: { label: "In Transit", tone: "pending" },
    delivered: { label: "Delivered", tone: "success" },
    delayed: { label: "Delayed", tone: "error" },
};

// How each issue status looks (the icon changes with the status too)
export const ISSUE_STATUSES = {
    open: { label: "Open", tone: "error", icon: TriangleAlert },
    investigating: { label: "Investigating", tone: "pending", icon: Package },
    resolved: { label: "Resolved", tone: "success", icon: CircleCheck },
};

// How each driver/delivery status looks in the tracking list
export const DRIVER_STATUSES = {
    in_transit: {
        label: "In Transit",
        pill: "bg-info-light text-info",
        bar: "bg-info",
        eta: "text-info",
        row: "",
    },
    delayed: {
        label: "Delayed",
        pill: "bg-pending-light text-pending",
        bar: "bg-pending",
        eta: "text-pending",
        row: "bg-pending-light/60", // the whole row gets a soft amber tint
    },
    completed: {
        label: "Completed",
        pill: "bg-success-light text-success",
        bar: "bg-success",
        eta: "text-success",
        row: "",
    },
};