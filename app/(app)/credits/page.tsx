import Link from "next/link";
import { redirect } from "next/navigation";

/** Ancienne route — redirige vers Plans. */
export default function CreditsPage() {
  redirect("/plans");
}
