import { PrismaClient } from '@prisma/client';

// Create a single Prisma client instance for the entire API so all callers
// share Prisma's connection pool instead of creating independent clients.
const prisma = new PrismaClient();

export default prisma;