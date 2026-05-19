import { redirect } from "next/navigation";

/**
 * Root page — proxy handles redirecting / to /dashboard or /login.
 * This is a fallback in case the page renders directly.
 */
export default function Home() {
  redirect("/dashboard");
}