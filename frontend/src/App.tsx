import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlassPanel } from './components/ui/GlassPanel';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-floresta-negra)] text-[var(--color-seda-milharal)] p-4 md:p-8 flex">
      {/* Sidebar - Oculta em telas muito pequenas, visível a partir de md */}
      <nav className="hidden md:flex flex-col w-64 mr-8">
        <h1 className="text-4xl font-cinzel font-bold text-[var(--color-caramelo-claro)] mb-8">
          Akasha
        </h1>
        <div className="space-y-4 text-lg">
          <a href="#" className="block hover:text-[var(--color-cobre)] transition">Biblioteca</a>
          <a href="#" className="block hover:text-[var(--color-cobre)] transition">Busca</a>
          <a href="#" className="block hover:text-[var(--color-cobre)] transition">Perfil</a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function Home() {
  return (
    <GlassPanel className="p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center">
      <h2 className="text-5xl font-cinzel font-bold mb-4 text-[var(--color-seda-milharal)]">
        Bem-vindo ao <span className='text-[var(--color-caramelo-claro)]'>Akasha</span>
      </h2>
      <p className="text-xl opacity-80 mb-10 max-w-2xl">
        Sua biblioteca pessoal de filmes e séries. Concebida para ser sua lista de filmes e séries pessoal.
      </p>

      <button
        tabIndex={0}
        className="tv-focus-glow bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all hover:bg-[var(--color-cobre)] hover:text-white"
      >
        Entrar com Google
      </button>
    </GlassPanel>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
