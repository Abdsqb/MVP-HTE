import { notFound } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";
import { getProfile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile((await params).id);
  if (!profile) notFound();
  return <ProfileEditor initial={profile} />;
}
