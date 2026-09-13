export default function SetupNeeded() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
        <h1 className="text-lg font-semibold">Falta configurar Supabase</h1>
        <p className="text-black/70 dark:text-white/70">
          Creá un proyecto en{" "}
          <a href="https://supabase.com" className="text-teal-600 underline">
            supabase.com
          </a>
          , ejecutá <code className="rounded bg-black/5 px-1 dark:bg-white/10">supabase/schema.sql</code>{" "}
          en el SQL Editor, y completá <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env.local</code>{" "}
          con la URL y la anon key del proyecto (mirá{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env.local.example</code>). Después
          reiniciá <code className="rounded bg-black/5 px-1 dark:bg-white/10">npm run dev</code>.
        </p>
      </div>
    </main>
  );
}
