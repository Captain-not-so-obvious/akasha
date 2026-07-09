import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SearchPage } from './pages/Search';
import { GlassPanel } from './components/ui/GlassPanel';
import { useAuth } from './hooks/useAuth';

function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block font-outfit text-lg transition-colors duration-200 tv-focus-glow rounded-lg px-3 py-2 -mx-3 ${
      isActive
        ? 'text-[var(--color-caramelo-claro)] font-semibold'
        : 'text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:text-[var(--color-cobre)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--color-floresta-negra)] text-[var(--color-seda-milharal)] p-4 md:p-8 flex">
      {/* Sidebar - Oculta em telas muito pequenas, visível a partir de md */}
      <nav className="hidden md:flex flex-col w-56 mr-8 justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-cinzel font-bold text-[var(--color-caramelo-claro)] mb-8">
            Akasha
          </h1>
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={navLinkClass} tabIndex={0}>Biblioteca</NavLink>
            <NavLink to="/search" className={navLinkClass} tabIndex={0}>Busca</NavLink>
            <NavLink to="/profile" className={navLinkClass} tabIndex={0}>Perfil</NavLink>
          </div>
        </div>

        {user && (
          <div className="border-t border-white/10 pt-4 mt-auto">
            <p className="text-xs opacity-65 truncate font-outfit mb-2">{user.email}</p>
            <button
              onClick={() => signOut()}
              tabIndex={0}
              className="tv-focus-glow block w-full text-left font-outfit text-sm text-[var(--color-caramelo-claro)] hover:text-red-400 transition cursor-pointer rounded-lg px-3 py-2 -mx-3"
            >
              Sair
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

function Home() {
  const { user } = useAuth();

  return (
    <GlassPanel className="p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center">
      <h2 className="text-5xl font-cinzel font-bold mb-4 text-[var(--color-seda-milharal)]">
        Bem-vindo ao <span className='text-[var(--color-caramelo-claro)]'>Akasha</span>
      </h2>
      <p className="text-xl font-outfit opacity-80 mb-10 max-w-2xl">
        Olá, {user?.user_metadata?.full_name || user?.email || 'Viajante'}! Sua biblioteca pessoal de filmes e séries está pronta.
      </p>
    </GlassPanel>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Privadas/Protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
