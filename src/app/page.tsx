import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <h1 className="text-6xl font-black text-red-800 mb-4 italic">StudentUP</h1>
      <div className="flex gap-4 mt-8">
        <Link href="/login" className="bg-red-800 text-white px-10 py-4 rounded-full font-bold">
          Accedi
        </Link>
        <Link href="/register" className="border-2 border-red-800 text-red-800 px-10 py-4 rounded-full font-bold">
          Registrati
        </Link>
      </div>
    </main>
  )
}