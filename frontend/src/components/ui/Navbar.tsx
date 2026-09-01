import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Film, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();

  // Fecha o menu mobile quando mudar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Suporte à tecla Escape para fechar o menu no celular/teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const navLinkClassMobile = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-outfit text-base transition-colors duration-200 ${
      isActive
        ? 'bg-[var(--color-caramelo-claro)]/20 text-[var(--color-caramelo-claro)] font-semibold border border-[var(--color-caramelo-claro)]/30'
        : 'text-[var(--color-seda-milharal)] opacity-80 hover:opacity-100 hover:bg-white/5'
    }`;

  const navLinkClassDesktop = ({ isActive }: { isActive: boolean }) =>
    `block font-outfit text-lg transition-colors duration-200 tv-focus-glow rounded-lg px-3 py-2 -mx-3 ${
      isActive
        ? 'text-[var(--color-caramelo-claro)] font-semibold'
        : 'text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:text-[var(--color-cobre)]'
    }`;

  return (
    <>
      {/* CIMA / TOPO - Cabeçalho Mobile (< md) */}
      <header className="md:hidden flex items-center justify-between p-4 mb-4 glass-panel rounded-2xl">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Akasha Logo" className="w-8 h-8 object-contain drop-shadow-md rounded-lg" />
          <h1 className="text-2xl font-cinzel font-bold text-[var(--color-caramelo-claro)]">
            Akasha
          </h1>
        </div>

        {/* Botão Hamburger com touch target generoso (mínimo 44px x 44px) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          aria-expanded={isOpen}
          tabIndex={0}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--color-seda-milharal)] hover:text-[var(--color-caramelo-claro)] hover:bg-white/10 active:scale-95 transition-all tv-focus-glow flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* GAVETA / OVERLAY - Menu Mobile Overlay (< md) */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div 
            className="glass-panel p-5 rounded-2xl flex flex-col gap-6 max-w-sm w-full mx-auto my-auto shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho Interno do Menu Mobile */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <img src="/favicon.png" alt="Akasha" className="w-7 h-7 object-contain" />
                <span className="font-cinzel text-xl font-bold text-[var(--color-caramelo-claro)]">
                  Menu
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar menu"
                tabIndex={0}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links do Menu Mobile */}
            <nav className="flex flex-col gap-2" aria-label="Navegação mobile">
              <NavLink to="/" end className={navLinkClassMobile} tabIndex={0}>
                <Film className="w-5 h-5 text-[var(--color-caramelo-claro)]" />
                <span>Biblioteca</span>
              </NavLink>
              <NavLink to="/search" className={navLinkClassMobile} tabIndex={0}>
                <Search className="w-5 h-5 text-[var(--color-caramelo-claro)]" />
                <span>Busca</span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClassMobile} tabIndex={0}>
                <User className="w-5 h-5 text-[var(--color-caramelo-claro)]" />
                <span>Perfil</span>
              </NavLink>
            </nav>

            {/* Área do Usuário e Logout Mobile */}
            {user && (
              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                <div className="px-2">
                  <p className="text-xs text-[var(--color-seda-milharal)]/60 font-outfit uppercase tracking-wider">Conectado como</p>
                  <p className="text-sm font-medium font-outfit truncate text-[var(--color-seda-milharal)]">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  tabIndex={0}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-outfit text-sm font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/20 border border-red-500/20 transition cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIDEBAR - Navegação para Desktop e TV (>= md) */}
      <nav className="hidden md:flex flex-col w-56 mr-8 justify-between flex-shrink-0" aria-label="Navegação principal">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/favicon.png" alt="Akasha Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-lg" />
            <h1 className="text-4xl font-cinzel font-bold text-[var(--color-caramelo-claro)]">
              Akasha
            </h1>
          </div>
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={navLinkClassDesktop} tabIndex={0}>
              Biblioteca
            </NavLink>
            <NavLink to="/search" className={navLinkClassDesktop} tabIndex={0}>
              Busca
            </NavLink>
            <NavLink to="/profile" className={navLinkClassDesktop} tabIndex={0}>
              Perfil
            </NavLink>
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
    </>
  );
}
