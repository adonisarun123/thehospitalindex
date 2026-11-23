import type { Metadata } from "next";
import { PendingPage } from "@/components/pending-page";

export const metadata: Metadata = { title: "Grievances", robots: { index: false, follow: true } };

export default function Page() {
  return (
    <PendingPage title="Grievances">
      <p>The grievance contact and response timelines will be published here before launch.</p>
    </PendingPage>
  );
}
