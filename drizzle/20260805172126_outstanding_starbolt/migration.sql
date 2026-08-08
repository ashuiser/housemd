ALTER TABLE "trusted_domains" RENAME COLUMN "prefix" TO "domain";--> statement-breakpoint
ALTER TABLE "trusted_domains" DROP COLUMN "scope";--> statement-breakpoint
DROP TYPE "trusted_domain_scope";