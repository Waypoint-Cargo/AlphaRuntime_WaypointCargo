import { getPrisma } from "../../config/database.js";
const db = () => getPrisma();
export const include = {
  order: true,
  trip: true,
  stop: { include: { outlet: true } },
  orderItem: true,
  reportedBy: true,
  resolvedBy: true,
  photos: true,
};
export async function nextIssueReferenceTx(tx) {
  const rows = await tx.issue.findMany({ select: { reference: true } });
  const max = rows.reduce(
    (m, r) => Math.max(m, Number(r.reference?.match(/^ISS-(\d+)$/)?.[1] || 0)),
    0,
  );
  return `ISS-${String(max + 1).padStart(3, "0")}`;
}
export const findIssueByClientMutationId = (id) =>
  id
    ? db().issue.findUnique({ where: { clientMutationId: id }, include })
    : null;
export const findIssue = (id) =>
  db().issue.findUnique({ where: { id }, include });
export async function listIssues(where, skip, take) {
  const [items, total] = await Promise.all([
    db().issue.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include,
    }),
    db().issue.count({ where }),
  ]);
  return { items, total };
}
