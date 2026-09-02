export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex max-w-lg flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sistema Vet
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Sistema para consultório veterinário
        </p>
        <p className="text-sm text-zinc-500">
          Frontend Next.js + React · Backend FastAPI · Supabase
        </p>
      </main>
    </div>
  );
}
