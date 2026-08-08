import { eq } from "drizzle-orm";
import { db } from "@/core/db/client";
import { trustedDomains } from "@/core/db/schema";

/**
 * Verifies if a given URL matches any of the user's trusted domain/path rules.
 */
export async function areUrlsTrusted(
  userId: string,
  urlsToCheck: string[],
): Promise<boolean[]> {
  const size = urlsToCheck.length;
  try {
    const urls = await db
      .select()
      .from(trustedDomains)
      .where(eq(trustedDomains.userId, userId));
    const parsedUrls = urls.map((u) => new URL(u.url));
    const pathNames = parsedUrls.map((u) => u.pathname);
    const hostnames = parsedUrls.map((u) => u.hostname);

    return urlsToCheck.map((u) => {
      const { hostname, pathname } = new URL(u);
      return isUrlTrusted(pathname, hostname, pathNames, hostnames);
    });
  } catch (error) {
    // If URL is unparseable or DB query fails, default to untrusted for security
    console.error("areUrlsTrusted error for URL: ", error);
    return Array.from({ length: size }, () => false);
  }
}

function isUrlTrusted(
  pathnameToCheck: string,
  hostnameToCheck: string,
  pathnames: string[],
  hostnames: string[],
): boolean {
  for (let i = 0; i < pathnames.length; i++) {
    if (
      hostnames[i] === hostnameToCheck &&
      pathnames[i].startsWith(pathnameToCheck)
    ) {
      return true;
    }
  }
  return false;
}
