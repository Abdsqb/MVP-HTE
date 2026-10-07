import { PageHeader } from "@/components/ui";
import UploadForm from "@/components/UploadForm";
import { ai } from "@/lib/ai";
import { listSamples } from "@/lib/samples";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  return (
    <>
      <PageHeader
        title="Upload documents"
        subtitle={`Drop a client questionnaire PDF and let AI build the profile. Using ${ai.name} (${ai.model}).`}
      />
      <UploadForm samples={await listSamples()} aiName={ai.name} />
    </>
  );
}
