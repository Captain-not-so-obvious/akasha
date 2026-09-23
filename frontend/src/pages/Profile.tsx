import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import { useProfile } from '../hooks/useProfile';
import { useSocial } from '../hooks/useSocial';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
  LogOut,
  User,
  Film,
  CheckCircle,
  Star,
  Users,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Save,
  AlertCircle,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { AvatarPickerModal } from '../components/profile/AvatarPickerModal';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { items, isLoading: isWishlistLoading, fetchWishlist } = useWishlist();
  const {
    profile,
    isLoading: isProfileLoading,
    updateUsername,
    updateAvatar,
    setFriendCodeLocally,
  } = useProfile();
  const { regenerateFriendCode } = useSocial();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);

  const userName = profile?.username || user?.user_metadata?.full_name || 'Viajante Akasha';
  const userAvatar = profile?.avatarUrl || user?.user_metadata?.avatar_url;

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const ratedItems = items.filter(i => i.userRating !== null);
  const avgRating =
    ratedItems.length > 0
      ? (ratedItems.reduce((acc, curr) => acc + (curr.userRating || 0), 0) / ratedItems.length).toFixed(1)
      : '-';

  const handleCopyCode = async () => {
    if (!profile?.friendCode) return;
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername === profile?.username) {
      setIsEditingUsername(false);
      return;
    }

    setIsSavingUsername(true);
    setFeedback(null);
    const result = await updateUsername(newUsername);
    setIsSavingUsername(false);

    if (result.success) {
      setIsEditingUsername(false);
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Tem certeza? Seu código antigo será invalidado imediatamente e não aceitará mais solicitações.')) {
      return;
    }

    setIsRegenerating(true);
    setFeedback(null);
    const newCode = await regenerateFriendCode();
    setIsRegenerating(false);

    if (newCode) {
      setFriendCodeLocally(newCode);
      setFeedback({ type: 'success', message: 'Novo Código de Amigo gerado com sucesso!' });
    } else {
      setFeedback({ type: 'error', message: 'Falha ao regenerar código. Tente novamente.' });
    }
  };

  const handleSelectAvatar = async (newUrl: string | null) => {
    setFeedback(null);
    const result = await updateAvatar(newUrl);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full pb-12">
      {/* Header */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-1">
          Perfil
        </h2>
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60">
          Suas estatísticas, identidade e configurações de conta.
        </p>
      </div>

      {/* Card Principal */}
      <GlassPanel className="p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative">
        {/* Avatar com ação de troca */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative group w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--color-caramelo-claro)] bg-black/40 flex items-center justify-center">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-[var(--color-caramelo-claro)] opacity-50" />
            )}
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              tabIndex={0}
              title="Alterar foto de perfil"
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer tv-focus-glow"
            >
              <Camera size={24} className="text-[var(--color-caramelo-claro)]" />
              <span className="text-[10px] font-outfit mt-1 font-semibold uppercase tracking-wider">Alterar</span>
            </button>
          </div>
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            tabIndex={0}
            className="flex items-center gap-1.5 text-xs font-outfit text-[var(--color-caramelo-claro)] hover:underline opacity-90 hover:opacity-100 transition tv-focus-glow cursor-pointer py-1 px-2 rounded-lg"
          >
            <Camera size={14} />
            <span>Trocar Foto</span>
          </button>
        </div>

        {/* Informações */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full pt-2">
          {/* Nome e Edição de Username */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <span className="font-cinzel text-xl text-[var(--color-caramelo-claro)]">@</span>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  tabIndex={0}
                  className="bg-black/60 border border-[var(--color-caramelo-claro)]/60 rounded-lg px-3 py-1 font-cinzel text-xl text-[var(--color-seda-milharal)] focus:outline-none tv-focus-glow"
                  placeholder="novo_usuario"
                  autoFocus
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={isSavingUsername}
                  tabIndex={0}
                  className="p-2 bg-[var(--color-caramelo-claro)] text-black rounded-lg hover:brightness-110 cursor-pointer tv-focus-glow"
                  title="Salvar"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingUsername(false);
                    setNewUsername(profile?.username || '');
                  }}
                  tabIndex={0}
                  className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 cursor-pointer tv-focus-glow"
                  title="Cancelar"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-3xl font-cinzel font-bold text-[var(--color-seda-milharal)]">
                  @{userName}
                </h3>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  tabIndex={0}
                  title="Editar nome de usuário"
                  className="text-[var(--color-seda-milharal)] opacity-50 hover:opacity-100 hover:text-[var(--color-caramelo-claro)] p-1 transition tv-focus-glow cursor-pointer"
                >
                  <Edit2 size={18} />
                </button>
              </>
            )}
          </div>

          <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60 mb-6">
            {profile?.email || user?.email}
          </p>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-6 p-3 rounded-xl flex items-center gap-2 font-outfit text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <StatCard
              icon={<Film size={20} />}
              title="Total Mídias"
              value={isWishlistLoading ? '...' : totalItems}
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              title="Concluídos"
              value={isWishlistLoading ? '...' : completedItems}
            />
            <StatCard
              icon={<Star size={20} />}
              title="Nota Média"
              value={isWishlistLoading ? '...' : avgRating}
            />
            <StatCard
              icon={<Users size={20} />}
              title="Amigos"
              value={isProfileLoading ? '...' : profile?.totalFriends ?? 0}
            />
          </div>
        </div>

        {/* Botão de Logout */}
        <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-center md:absolute top-8 right-8">
          <button
            onClick={() => signOut()}
            tabIndex={0}
            className="tv-focus-glow flex items-center gap-2 bg-red-500/20 text-red-400 px-5 py-2.5 rounded-lg font-outfit font-semibold hover:bg-red-500/40 transition cursor-pointer"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </GlassPanel>

      {/* Bloco de Segurança Social: Friend Code */}
      <GlassPanel className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
        <div>
          <h4 className="font-cinzel text-lg font-bold text-[var(--color-caramelo-claro)] mb-1 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Conexão Social Segura (Friend Code)
          </h4>
          <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60 max-w-xl">
            Seu Código de Amigo permite que outras pessoas te encontrem facilmente na TV e no Celular sem expor seus dados pessoais. Se você receber solicitações indesejadas, basta regenerar o código.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-cinzel text-xl font-bold text-[var(--color-caramelo-claro)] tracking-widest bg-black/50 px-4 py-2 rounded-xl border border-white/10 select-all">
            {isProfileLoading ? 'Carregando...' : profile?.friendCode || 'Não gerado'}
          </span>
          <button
            onClick={handleCopyCode}
            tabIndex={0}
            title="Copiar Código"
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-[var(--color-seda-milharal)] hover:text-white hover:bg-white/15 transition tv-focus-glow cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={handleRegenerateCode}
            disabled={isRegenerating}
            tabIndex={0}
            title="Regenerar Código (Segurança)"
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--color-seda-milharal)] hover:bg-red-500/20 hover:text-red-300 transition tv-focus-glow cursor-pointer font-outfit text-xs font-semibold flex items-center gap-2 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerar</span>
          </button>
        </div>
      </GlassPanel>

      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={profile?.avatarUrl}
        defaultOAuthAvatar={user?.user_metadata?.avatar_url}
        onSelectAvatar={handleSelectAvatar}
      />
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
    <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center md:items-start gap-1">
      <div className="text-[var(--color-caramelo-claro)]">{icon}</div>
      <p className="font-outfit text-[10px] text-[var(--color-seda-milharal)] opacity-60 uppercase tracking-wider font-bold">
        {title}
      </p>
      <p className="font-cinzel text-xl font-bold text-white">{value}</p>
    </div>
  );
}
