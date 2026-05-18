import { redirect } from "next/navigation";

/**
 * Root page — just redirects.
 * The proxy handles auth checks:
 * - If logged in → /dashboard works
 * - If not logged in → proxy redirects /dashboard to /login
 */
export default function Home() {
  redirect("/dashboard");
}
