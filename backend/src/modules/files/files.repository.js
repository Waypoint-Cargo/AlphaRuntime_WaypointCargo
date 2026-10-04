import { getPrisma } from "../../config/database.js";
const db = () => getPrisma();
export const createFile = (data) => db().file.create({ data });
export const findFile = (id) => db().file.findUnique({ where: { id } });
export const findFileByClientFileId = (clientFileId) =>
  clientFileId
    ? db().file.findUnique({ where: { clientFileId } })
    : null;
