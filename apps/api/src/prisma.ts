import { PrismaClient } from '@prisma/client';

// Create a single Prisma client instance for the entire API. This ensures
// connection pooling and avoids exhausting SQLite file handles.
const prisma = new PrismaClient();

export default prisma;