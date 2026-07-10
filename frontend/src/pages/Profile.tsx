import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import { GlassPanel } from '../components/ui/GlassPanel';
import { LogOut, User, Film, CheckCircle, Star } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { items, isLoading, fetchWishlist } = useWishlist();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const userName = user?.user_metadata?.full_name || 'Viajante Akasha';
  const userAvatar = user?.user_metadata?.avatar_url;

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  
  const ratedItems = items.filter(i => i.userRating !== null);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + (curr.userRating || 0), 0) / ratedItems.length).toFixed(1)
    : '-';

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full">
      {/* Header */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-1">
          Perfil
        </h2>
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60">
          Suas estatísticas e configurações de conta.
        </p>
      </div>

      <GlassPanel className="p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--color-caramelo-claro)] flex-shrink-0 bg-black/40 flex items-center justify-center">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <User size={64} className="text-[var(--color-caramelo-claro)] opacity-50" />
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full pt-2">
          <h3 className="text-3xl font-cinzel font-bold text-[var(--color-seda-milharal)] mb-2">
            {userName}
          </h3>
          <p className="font-outfit text-[var(--color-seda-milharal)] opacity-60 mb-8">
            {user?.email}
          </p>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <StatCard icon={<Film size={24} />} title="Total de Mídias" value={isLoading ? '...' : totalItems} />
            <StatCard icon={<CheckCircle size={24} />} title="Concluídos" value={isLoading ? '...' : completedItems} />
            <StatCard icon={<Star size={24} />} title="Nota Média" value={isLoading ? '...' : avgRating} />
          </div>
        </div>

        {/* Ações Mobile (O botão de sair já tem no Sidebar para desktop, mas no mobile é bom ter aqui) */}
        <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-center md:absolute top-8 right-8">
           <button
            onClick={() => signOut()}
            tabIndex={0}
            className="tv-focus-glow flex items-center gap-2 bg-red-500/20 text-red-400 px-6 py-3 rounded-lg font-outfit font-semibold hover:bg-red-500/40 transition cursor-pointer"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};

// --- Sub-componente ---

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center md:items-start gap-2">
      <div className="text-[var(--color-caramelo-claro)]">
        {icon}
      </div>
      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60 uppercase tracking-wider font-bold">
        {title}
      </p>
      <p className="font-cinzel text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}
