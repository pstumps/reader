import PdfReader from "@/components/PdfReader/PdfReader";

export default async function ReadPage( {params} : {params: Promise<{ docId: string }>}) {
    const { docId } = await params;

    const fileUrl = `https://api.reader.ai/v1/documents/${docId}/file`;

    return (
        <div style={{ padding: 24 }}>
            <PdfReader fileUrl={fileUrl} />
        </div>
    );
}