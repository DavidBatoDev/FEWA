export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lead Detail</h1>
      <p className="text-muted-foreground">Lead ID: {params.id}</p>
    </main>
  );
}
