import type { Metadata } from "next";
import ChatRoom from "@/components/ChatRoom";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Tanya hukum tanah — ${APP_NAME}` };

// /chat           -> tanya umum
// /chat?doc=<id>  -> tanya soal dokumen yang sudah diunggah (dikirim sebagai document_id)
export default async function ChatPage({ searchParams }: PageProps<"/chat">) {
  const { doc } = await searchParams;
  const documentId = typeof doc === "string" && doc ? doc : undefined;
  // key: pindah dari chat dokumen ke chat umum = percakapan baru
  return <ChatRoom key={documentId ?? "umum"} documentId={documentId} />;
}
