import { ApplicationShell } from "@/components/application-shell";
import { getInstitutionalUser } from "@/lib/supabase/auth";

export default async function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await getInstitutionalUser();
  return <ApplicationShell>{children}</ApplicationShell>;
}

