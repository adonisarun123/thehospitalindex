import type { Metadata } from "next";
import { PendingPage } from "@/components/pending-page";

export const metadata: Metadata = { title: "Privacy", robots: { index: false, follow: true } };

export default function Page() {
  return (
    <PendingPage title="Privacy">
      <p>The privacy notice is being finalised with legal counsel and will be published here before the site collects any personal data. Browsing this directory does not require an account.</p>
    </PendingPage>
  );
}
