// 1. Creates the first ADMIN account from environment variables. Safe to run repeatedly:
//    an existing admin is left untouched (its password is never overwritten).
// 2. Loads the reference data from backend/data_files (see prisma/seed-reference.js).
//
//   ADMIN_EMPLOYEE_NUMBER  e.g. adm_001   (3-20 chars: a-z, 0-9, _)
//   ADMIN_USERNAME         e.g. admin     (3-20 chars: a-z, 0-9, _)
//   ADMIN_EMAIL
//   ADMIN_FULL_NAME
//   ADMIN_PASSWORD         8+ chars, at least one uppercase letter and one number
//
// Run with:  npm run db:seed

import "dotenv/config";
import bcrypt from "bcrypt";
import { Role } from "../src/generated/prisma/index.js";
import { getPrisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/config/logger.js";
import { seedReference } from "./seed-reference.js";

const SALT_ROUNDS = 12;

const readInput = () => {
    const input = {
        employeeNumber: (process.env.ADMIN_EMPLOYEE_NUMBER ?? "").trim().toLowerCase(),
        username: (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase(),
        email: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
        fullName: (process.env.ADMIN_FULL_NAME ?? "").trim(),
        password: process.env.ADMIN_PASSWORD ?? "",
    };

    const problems = [];
    if (!/^[a-z0-9_]{3,20}$/.test(input.employeeNumber)) problems.push("ADMIN_EMPLOYEE_NUMBER (3-20 chars: a-z, 0-9, _)");
    if (!/^[a-z0-9_]{3,20}$/.test(input.username)) problems.push("ADMIN_USERNAME (3-20 chars: a-z, 0-9, _)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) problems.push("ADMIN_EMAIL (valid e-mail)");
    if (input.fullName.length < 2) problems.push("ADMIN_FULL_NAME (at least 2 chars)");
    if (input.password.length < 8 || input.password.length > 128 || !/[A-Z]/.test(input.password) || !/\d/.test(input.password)) {
        problems.push("ADMIN_PASSWORD (8+ chars, one uppercase letter, one number)");
    }
    return { input, problems };
};

const seedAdmin = async () => {
    const { input, problems } = readInput();
    if (problems.length > 0) {
        logger.error(`Admin seed skipped - missing or invalid: ${problems.join("; ")}`);
        process.exitCode = 1;
        return;
    }

    const db = getPrisma();

    const existing = await db.user.findUnique({
        where: { employeeNumber: input.employeeNumber },
        select: { id: true, role: true, isApproved: true, isActive: true },
    });
    if (existing) {
        if (existing.role === Role.ADMIN && existing.isApproved && existing.isActive) {
            logger.info(`Admin ${input.employeeNumber} already exists - nothing to do.`);
        } else {
            logger.error(`Employee number ${input.employeeNumber} already belongs to a user who is not an active, approved ADMIN. Resolve that account manually.`);
            process.exitCode = 1;
        }
        return;
    }

    const clash = await db.user.findFirst({
        where: { OR: [{ username: input.username }, { email: input.email }] },
        select: { username: true, email: true },
    });
    if (clash) {
        logger.error("Admin seed failed - the username or email is already used by another account.");
        process.exitCode = 1;
        return;
    }

    await db.user.create({
        data: {
            employeeNumber: input.employeeNumber,
            username: input.username,
            email: input.email,
            fullName: input.fullName,
            password: await bcrypt.hash(input.password, SALT_ROUNDS),
            role: Role.ADMIN,
            isApproved: true,
            approvedAt: new Date(),
        },
    });
    logger.info(`Admin ${input.employeeNumber} created.`);
};

try {
    await seedAdmin();
} catch (err) {
    logger.error("Admin seed failed.", { message: err.message });
    process.exitCode = 1;
}

try {
    await seedReference(getPrisma());
} catch (err) {
    logger.error("Reference data seed failed.", { message: err.message });
    process.exitCode = 1;
} finally {
    await disconnectDatabase();
}
