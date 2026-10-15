import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Hello, World!</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        This is our CS491 Fall 2026 project!!!!
      </p>
      <div className="mt-4">
        <Link
          href="/signup"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          Go to Sign Up
        </Link>
      </div>
    </main>
  );
}
