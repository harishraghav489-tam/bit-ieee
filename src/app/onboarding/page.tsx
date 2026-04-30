import { redirect } from "next/navigation";

// Legacy route — redirect to the new multi-step profile setup form
export default function OnboardingRedirect() {
  redirect("/profile-setup");
}
