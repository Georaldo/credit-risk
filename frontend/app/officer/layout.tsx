// frontend/app/officer/layout.tsx
export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
}