import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <h2 className="text-4xl font-black text-[#000666] mb-4">404</h2>
      <p className="text-slate-600 mb-8 font-medium">Página não encontrada</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-105 transition-all"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
