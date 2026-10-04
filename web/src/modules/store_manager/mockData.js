// Temporary sample data. We'll replace it with real data from the backend later.
export const DELIVERIES = [
    { id: "ORD-101", type: "dry", window: "06:30 – 07:30", status: "confirmed" },
    { id: "ORD-102", type: "chilled", window: "07:00 – 07:45", status: "in_transit" },
    { id: "ORD-103", type: "dry", window: "08:00 – 09:00", status: "delivered" },
    { id: "ORD-104", type: "chilled", window: "09:00 – 09:45", status: "confirmed" },
    { id: "ORD-105", type: "dry", window: "10:00 – 11:00", status: "confirmed" },
    { id: "ORD-106", type: "frozen", window: "11:30 – 12:15", status: "delayed" },
];

export const CURRENT_DELIVERY = {
    id: "ORD-102",
    typeLabel: "Chilled delivery",
    eta: "07:00 – 07:45",
    vehicle: "WP CAB-4412 · Refrigerated",
    driver: "Nuwan Perera",
    status: "in_transit",
    progress: 65, // percent of the route completed
    departed: "06:35",
    arrives: "07:45",
};

export const ISSUES = [
    {
        id: 1,
        order: "ORD-106",
        title: "Delivery delayed",
        description: "Frozen goods running about 25 minutes late due to traffic near Kelaniya.",
        time: "10 min ago",
        status: "open",
    },
    {
        id: 2,
        order: "ORD-103",
        title: "Missing item",
        description: "One carton of rice was short on delivery. Supplier has been contacted.",
        time: "1 hr ago",
        status: "investigating",
    },
    {
        id: 3,
        order: "ORD-099",
        title: "Damaged packaging",
        description: "Two damaged dairy packs were replaced on the next route.",
        time: "Yesterday",
        status: "resolved",
    },
];