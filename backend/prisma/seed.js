/**
 * Additive seed: creates the Stock table if missing, then adds sample stock
 * (every depot) and sample Sri Lankan drivers. Never updates or deletes
 * existing rows (upserts use an empty `update`).
 *
 * Usage: npm run db:seed
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// [sku, itemName, unit, quantityOnHand]  — a few are deliberately low.
const STOCK_CATALOG = [
	// FRESH
	["DAI-MILK-001", "Organic Whole Milk 1L", "EA", 500],
	["DAI-CHE-002", "Cheddar Cheese 250g", "EA", 300],
	["DAI-YOG-003", "Natural Yoghurt 500g", "EA", 400],
	["DAI-BUT-004", "Salted Butter 200g", "EA", 250],
	["BAK-BRD-010", "Sliced Bread Loaf", "EA", 600],
	["BAK-BUN-011", "Fish Bun Pack of 6", "EA", 35],
	["PRO-BAN-020", "Embul Bananas 1kg", "KG", 800],
	["PRO-TOM-021", "Tomatoes 1kg", "KG", 450],
	["PRO-CAR-022", "Carrots 1kg", "KG", 20],
	["MEA-CHK-030", "Fresh Chicken 1kg", "KG", 350],
	["SEA-TUN-031", "Fresh Tuna Fillet 1kg", "KG", 120],
	["EGG-DOZ-040", "Eggs Tray of 30", "EA", 280],
	// STYLE
	["APP-TSH-100", "Cotton T-Shirt (M)", "EA", 900],
	["APP-TSH-101", "Cotton T-Shirt (L)", "EA", 750],
	["APP-JNS-102", "Denim Jeans (32)", "EA", 400],
	["APP-SAR-103", "Handloom Saree", "EA", 150],
	["APP-SHO-104", "Canvas Sneakers (42)", "EA", 15],
	["APP-BAG-105", "Leather Handbag", "EA", 90],
	// TECH
	["TEC-PHN-200", "Smartphone 128GB", "EA", 120],
	["TEC-LAP-201", "Laptop 15.6in", "EA", 60],
	["TEC-HDP-202", "Wireless Headphones", "EA", 300],
	["TEC-CHG-203", "USB-C Fast Charger", "EA", 800],
	["TEC-TV-204", "LED TV 43in", "EA", 8],
	["TEC-PWR-205", "Power Bank 20000mAh", "EA", 450],
];

const DRIVERS = [
	["Nuwan Perera", "+94771234501"],
	["Kasun Jayawardena", "+94712345602"],
	["Saman Kumara Wickramasinghe", "+94763456703"],
	["Chaminda Bandara", "+94774567804"],
	["Ruwan Fernando", "+94705678905"],
	["Dilshan Silva", "+94726789006"],
	["Lasith Gunawardena", "+94777890107"],
	["Tharindu Senanayake", "+94718901208"],
	["Mohamed Rizwan", "+94759012309"],
	["Kandasamy Sivakumar", "+94770123410"],
];

async function ensureStockTable() {
	const sqlPath = path.join(__dirname, "sql", "add_stock.sql");
	if (fs.existsSync(sqlPath)) {
		const ddl = fs.readFileSync(sqlPath, "utf8");
		const statements = ddl
			.split(/;\s*$/m)
			.map((s) => s.replace(/^--.*$/gm, "").trim())
			.filter(Boolean);
		for (const stmt of statements) await prisma.$executeRawUnsafe(stmt);
		console.log("Stock table ready.");
	}
}

async function seedStock(depots) {
	let created = 0;
	for (const depot of depots) {
		for (const [sku, itemName, unit, qty] of STOCK_CATALOG) {
			const row = await prisma.stock.upsert({
				where: { depotId_sku: { depotId: depot.id, sku } },
				update: {},
				create: { depotId: depot.id, sku, itemName, unit, quantityOnHand: qty },
			});
			if (row.createdAt.getTime() > Date.now() - 60_000) created++;
		}
	}
	console.log(`Stock: ${depots.length} depot(s) x ${STOCK_CATALOG.length} SKUs (${created} newly created).`);
}

async function seedDrivers(depots) {
	const password = process.env.SEED_DRIVER_PASSWORD || "Driver@12345";
	const hash = await bcrypt.hash(password, 10);
	const links = [];
	for (let i = 0; i < DRIVERS.length; i++) {
		const [fullName, phone] = DRIVERS[i];
		const n = String(i + 1).padStart(3, "0");
		const email = `${fullName.split(" ")[0].toLowerCase()}.${fullName.split(" ").slice(-1)[0].toLowerCase()}@waypointcargo.lk`;
		const user = await prisma.user.upsert({
			where: { email },
			update: {},
			create: {
				email,
				password: hash,
				role: "DRIVER",
				employeeNumber: `DRV-${n}`,
				fullName,
				phone,
				isActive: true,
				isApproved: true,
				approvedAt: new Date(),
			},
		});
		if (depots.length) links.push({ userId: user.id, depotId: depots[i % depots.length].id });
		console.log(`Driver: ${fullName} <${email}>`);
	}
	if (links.length) await prisma.userDepot.createMany({ data: links, skipDuplicates: true });
	console.log(`Driver password (new accounts): ${password}`);
}

try {
	await ensureStockTable();
	const depots = await prisma.depot.findMany({ select: { id: true, code: true }, orderBy: { code: "asc" } });
	if (!depots.length) console.warn("No depots found; skipping stock and depot assignment.");
	await seedStock(depots);
	await seedDrivers(depots);
} finally {
	await prisma.$disconnect();
}
