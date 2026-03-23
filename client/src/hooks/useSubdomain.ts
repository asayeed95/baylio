/**
 * useSubdomain — detects which portal the user is on based on hostname.
 *
 * admin.baylio.io    → "admin"
 * partners.baylio.io → "partners"
 * baylio.io / localhost / sandbox → "main"
 */
export type SubdomainContext = "admin" | "partners" | "main";

export function useSubdomain(): SubdomainContext {
  const hostname = window.location.hostname;

  if (
    hostname.startsWith("admin.") ||
    hostname === "admin.baylio.io"
  ) {
    return "admin";
  }

  if (
    hostname.startsWith("partners.") ||
    hostname === "partners.baylio.io"
  ) {
    return "partners";
  }

  // Dev convenience: ?portal=admin or ?portal=partners in URL
  const params = new URLSearchParams(window.location.search);
  const portal = params.get("portal");
  if (portal === "admin") return "admin";
  if (portal === "partners") return "partners";

  return "main";
}

/**
 * Returns true if the current hostname is the admin subdomain.
 */
export function isAdminSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith("admin.") || hostname === "admin.baylio.io";
}

/**
 * Returns true if the current hostname is the partners subdomain.
 */
export function isPartnersSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith("partners.") || hostname === "partners.baylio.io";
}
