import { eq } from "drizzle-orm";
import { db } from "@/core/db/client";
import { trustedDomains } from "@/core/db/schema";

/**
 * Verifies if a given URL matches any of the user's trusted domain/path rules.
 */
export async function isUrlTrusted(
  userId: string,
  urlToCheck: string,
): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlToCheck);
    const hostname = parsedUrl.hostname;
    // URL pathname always starts with '/'
    // We combine them to match against rules like `example.com/docs`
    const fullPathToCheck = `${hostname}${parsedUrl.pathname}`;

    const rules = await db
      .select()
      .from(trustedDomains)
      .where(eq(trustedDomains.userId, userId));

    for (const rule of rules) {
      if (rule.scope === "domain") {
        // Domain scope matches exact domain or any subdomain
        // Example: rule "wikipedia.org" matches "en.wikipedia.org" but not "fake-wikipedia.org"
        if (hostname === rule.prefix || hostname.endsWith(`.${rule.prefix}`)) {
          return true;
        }
      } else if (rule.scope === "path") {
        // Path scope matches if the domain+path starts with the rule prefix
        // Example: rule "mdjournal.com/docs" matches "mdjournal.com/docs/lungs"
        if (fullPathToCheck.startsWith(rule.prefix)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    // If URL is unparseable or DB query fails, default to untrusted for security
    console.error(`isUrlTrusted error for URL ${urlToCheck}:`, error);
    return false;
  }
}
