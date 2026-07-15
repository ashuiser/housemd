import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const sourceStatusEnum = pgEnum("source_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);

export const trustedDomainScopeEnum = pgEnum("trusted_domain_scope", [
  "domain",
  "path",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const internetModeEnum = pgEnum("internet_mode", [
  "none",
  "trusted_only",
  "all",
  "all_verified",
]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  age: integer().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verified: boolean().notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sources = pgTable("sources", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  r2Key: text("r2_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: sourceStatusEnum().notNull().default("uploading"),
  vectorIdsCount: integer("vector_ids_count"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const trustedDomains = pgTable("trusted_domains", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prefix: text().notNull(),
  scope: trustedDomainScopeEnum().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chats = pgTable("chats", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: messageRoleEnum().notNull(),
  content: text().notNull(),
  citedSourceIds: jsonb("cited_source_ids").$type<string[]>(),
  citedWebUrls: jsonb("cited_web_urls").$type<string[]>(),
  selectedSourceIds: jsonb("selected_source_ids").$type<string[]>(),
  internetMode: internetModeEnum("internet_mode"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
