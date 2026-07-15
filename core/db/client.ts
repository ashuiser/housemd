import { drizzle } from "drizzle-orm/neon-http";

// biome-ignore lint/style/noNonNullAssertion: ignore
export const db = drizzle(process.env.NEON_DATABASE_URL!);
