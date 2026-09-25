import React, { useState } from 'react';
import { useSocial } from '../hooks/useSocial';
import { useProfile } from '../hooks/useProfile';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import {
  Users,
  UserPlus,
  Check,
  X,
  Copy,
  Clock,
  Film,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Activity,
  Sparkles,
} from 'lucide-react';
import { ComparisonView } from '../components/social/ComparisonView';
import type { Friend } from '../types/social';

export const Social: React.FC = () => {
  const {
    friends,
    requests,
    blockedUsers,
    isLoading: isSocialLoading,
    sendFriendRequest,
    respondRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useSocial();

  const { profile, isLoading: isProfileLoading } = useProfile();

  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'received' | 'sent' | 'blocked'>('feed');
  const [targetInput, setTargetInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [comparingFriend, setComparingFriend] = useState<Friend | null>(null);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const result = await sendFriendRequest(targetInput);
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTargetInput('');
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

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

  const handleAction = async (requestId: number, action: 'accept' | 'decline' | 'block') => {
    if (action === 'block' && !window.confirm('Deseja realmente bloquear este usuário? Ele não poderá mais enviar solicitações.')) {
      return;
    }
    setFeedback(null);
    const result = await respondRequest(requestId, action);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!window.confirm(`Deseja realmente desfazer a amizade com ${friendName}?`)) return;
    setFeedback(null);
    const result = await removeFriend(friendId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleBlockDirect = async (userId: string, userName: string) => {
    if (!window.confirm(`Bloquear ${userName}? A amizade será cancelada e ele não poderá mais se conectar com você.`)) {
      return;
    }
    setFeedback(null);
    const result = await blockUser(userId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleUnblock = async (userId: string, userName: string) => {
    if (!window.confirm(`Deseja desbloquear ${userName}?`)) return;
    setFeedback(null);
    const result = await unblockUser(userId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const pendingReceivedCount = requests.received.length;

  if (comparingFriend) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto h-full pb-12">
        <ComparisonView
          friendId={comparingFriend.id}
          friendName={comparingFriend.username}
          onBack={() => setComparingFriend(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto h-full pb-12">
      {/* Cabeçalho */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-1 flex items-center gap-3">
          <Users className="w-8 h-8" />
          Círculo Akasha
        </h2>
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60">
          Conecte-se com amigos para acompanhar acervos e trocar recomendações confiáveis.
        </p>
      </div>

      {/* Painel Superior: Seu Friend Code & Adicionar Amigo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Card do Seu Código */}
        <GlassPanel className="p-6 md:col-span-5 flex flex-col justify-between gap-4">
          <div>
            <span className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-70 uppercase tracking-wider font-semibold">
              Seu Código de Amigo (Friend Code)
            </span>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-cinzel text-2xl font-bold text-[var(--color-caramelo-claro)] tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 select-all">
                {isProfileLoading ? 'Carregando...' : profile?.friendCode || 'Não gerado'}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copiar Código"
                tabIndex={0}
                className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[var(--color-seda-milharal)] hover:text-white hover:bg-white/15 transition tv-focus-glow flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
              >
                {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60 mt-3">
              Compartilhe este código ou seu e-mail para amigos te adicionarem.
            </p>
          </div>
        </GlassPanel>

        {/* Formulário de Adicionar Amigo */}
        <GlassPanel className="p-6 md:col-span-7 flex flex-col justify-between">
          <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
            <label className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-70 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[var(--color-caramelo-claro)]" />
              Adicionar Amigo
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder="Digite e-mail, @username ou Friend Code..."
                tabIndex={0}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-outfit text-sm text-[var(--color-seda-milharal)] placeholder:opacity-40 focus:outline-none focus:border-[var(--color-caramelo-claro)] transition tv-focus-glow"
              />
              <button
                type="submit"
                disabled={isSubmitting || !targetInput.trim()}
                tabIndex={0}
                className="px-5 py-3 rounded-xl bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-outfit font-semibold hover:brightness-110 active:scale-95 disabled:opacity-50 transition cursor-pointer tv-focus-glow flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando...' : 'Conectar'}</span>
              </button>
            </div>
          </form>

          {/* Feedback de envio */}
          {feedback && (
            <div
              className={`mt-3 p-3 rounded-xl flex items-center gap-2 font-outfit text-xs ${
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
        </GlassPanel>
      </div>

      {/* Abas de Navegação Social */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('feed')}
          tabIndex={0}
          className={`px-4 py-3 font-outfit text-sm font-semibold rounded-t-xl transition-all cursor-pointer tv-focus-glow flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'feed'
              ? 'bg-white/10 text-[var(--color-caramelo-claro)] border-b-2 border-[var(--color-caramelo-claro)]'
              : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Feed da Rede</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          tabIndex={0}
          className={`px-4 py-3 font-outfit text-sm font-semibold rounded-t-xl transition-all cursor-pointer tv-focus-glow flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'friends'
              ? 'bg-white/10 text-[var(--color-caramelo-claro)] border-b-2 border-[var(--color-caramelo-claro)]'
              : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Amigos ({friends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('received')}
          tabIndex={0}
          className={`px-4 py-3 font-outfit text-sm font-semibold rounded-t-xl transition-all cursor-pointer tv-focus-glow flex items-center gap-2 relative whitespace-nowrap ${
            activeTab === 'received'
              ? 'bg-white/10 text-[var(--color-caramelo-claro)] border-b-2 border-[var(--color-caramelo-claro)]'
              : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Solicitações Recebidas</span>
          {pendingReceivedCount > 0 && (
            <span className="bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] text-xs font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">
              {pendingReceivedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          tabIndex={0}
          className={`px-4 py-3 font-outfit text-sm font-semibold rounded-t-xl transition-all cursor-pointer tv-focus-glow flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sent'
              ? 'bg-white/10 text-[var(--color-caramelo-claro)] border-b-2 border-[var(--color-caramelo-claro)]'
              : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Enviadas ({requests.sent.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('blocked')}
          tabIndex={0}
          className={`px-4 py-3 font-outfit text-sm font-semibold rounded-t-xl transition-all cursor-pointer tv-focus-glow flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'blocked'
              ? 'bg-white/10 text-[var(--color-caramelo-claro)] border-b-2 border-[var(--color-caramelo-claro)]'
              : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Bloqueados ({blockedUsers.length})</span>
        </button>
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === 'feed' && <ActivityFeed />}

      {isSocialLoading && activeTab !== 'feed' && (
        <div className="py-12 text-center text-sm font-outfit text-[var(--color-seda-milharal)] opacity-50">
          Carregando conexões...
        </div>
      )}

      {/* ABA: AMIGOS CONFIRMADOS */}
      {!isSocialLoading && activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <GlassPanel className="p-8 text-center text-[var(--color-seda-milharal)] opacity-60 font-outfit text-sm">
              Você ainda não possui amigos adicionados. Digite o e-mail ou código de alguém acima para começar a conectar!
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {friends.map(friend => (
                <GlassPanel
                  key={friend.id}
                  className="p-5 flex flex-col justify-between gap-4 border border-white/5 hover:border-[var(--color-caramelo-claro)]/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-black/40 border border-[var(--color-caramelo-claro)]/40 flex items-center justify-center flex-shrink-0">
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.username)}`;
                          }}
                        />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.username)}`}
                          alt={friend.username}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-cinzel font-bold text-base text-[var(--color-seda-milharal)] truncate">
                        {friend.username}
                      </h4>
                      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50 truncate">
                        {friend.friendCode || 'Viajante'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-70 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[var(--color-caramelo-claro)]" />
                      {friend.totalMedia} mídias
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleBlockDirect(friend.id, friend.username)}
                        title="Bloquear viajante"
                        aria-label={`Bloquear ${friend.username}`}
                        tabIndex={0}
                        className="text-amber-400/60 hover:text-amber-400 p-2 rounded-lg hover:bg-amber-500/10 transition tv-focus-glow cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
                        title="Desfazer amizade"
                        aria-label={`Desfazer amizade com ${friend.username}`}
                        tabIndex={0}
                        className="text-red-400/60 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition tv-focus-glow cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setComparingFriend(friend)}
                    tabIndex={0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--color-caramelo-claro)]/15 hover:bg-[var(--color-caramelo-claro)]/25 border border-[var(--color-caramelo-claro)]/30 text-[var(--color-caramelo-claro)] text-xs font-semibold transition tv-focus-glow cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sincronia Cósmica</span>
                  </button>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: SOLICITAÇÕES RECEBIDAS */}
      {!isSocialLoading && activeTab === 'received' && (
        <div className="flex flex-col gap-3">
          {requests.received.length === 0 ? (
            <GlassPanel className="p-8 text-center text-[var(--color-seda-milharal)] opacity-60 font-outfit text-sm">
              Nenhuma solicitação de amizade pendente no momento.
            </GlassPanel>
          ) : (
            requests.received.map(req => (
              <GlassPanel
                key={req.id}
                className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-black/40 border border-[var(--color-caramelo-claro)]/40 flex items-center justify-center flex-shrink-0">
                    {req.user.avatarUrl ? (
                      <img
                        src={req.user.avatarUrl}
                        alt={req.user.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`}
                        alt={req.user.username}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-base text-[var(--color-seda-milharal)]">
                      {req.user.username}
                    </h4>
                    <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
                      Deseja conectar com você • {req.user.friendCode || 'Viajante'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleAction(req.id, 'accept')}
                    tabIndex={0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-outfit text-sm font-semibold transition cursor-pointer tv-focus-glow min-h-[44px]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aceitar</span>
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'decline')}
                    tabIndex={0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[var(--color-seda-milharal)] font-outfit text-sm font-semibold transition cursor-pointer tv-focus-glow min-h-[44px]"
                  >
                    <X className="w-4 h-4" />
                    <span>Recusar</span>
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'block')}
                    tabIndex={0}
                    title="Bloquear usuário"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-outfit text-xs font-semibold transition cursor-pointer tv-focus-glow min-h-[44px]"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Bloquear</span>
                  </button>
                </div>
              </GlassPanel>
            ))
          )}
        </div>
      )}

      {/* ABA 3: SOLICITAÇÕES ENVIADAS */}
      {!isSocialLoading && activeTab === 'sent' && (
        <div className="flex flex-col gap-3">
          {requests.sent.length === 0 ? (
            <GlassPanel className="p-8 text-center text-[var(--color-seda-milharal)] opacity-60 font-outfit text-sm">
              Você não enviou nenhuma solicitação pendente no momento.
            </GlassPanel>
          ) : (
            requests.sent.map(req => (
              <GlassPanel
                key={req.id}
                className="p-4 flex items-center justify-between gap-4 border border-white/5 opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                    {req.user.avatarUrl ? (
                      <img
                        src={req.user.avatarUrl}
                        alt={req.user.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`}
                        alt={req.user.username}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-sm text-[var(--color-seda-milharal)]">
                      {req.user.username}
                    </h4>
                    <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
                      {req.user.friendCode || 'Viajante'}
                    </p>
                  </div>
                </div>

                <span className="font-outfit text-xs px-3 py-1 rounded-full bg-white/5 text-[var(--color-seda-milharal)] opacity-70 border border-white/10 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Aguardando resposta
                </span>
              </GlassPanel>
            ))
          )}
        </div>
      )}

      {/* ABA 4: USUÁRIOS BLOQUEADOS */}
      {!isSocialLoading && activeTab === 'blocked' && (
        <div className="flex flex-col gap-3">
          {blockedUsers.length === 0 ? (
            <GlassPanel className="p-8 text-center text-[var(--color-seda-milharal)] opacity-60 font-outfit text-sm">
              Nenhum usuário bloqueado.
            </GlassPanel>
          ) : (
            blockedUsers.map(b => (
              <GlassPanel
                key={b.id}
                className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-500/10 bg-red-950/10"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-black/40 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    {b.avatarUrl ? (
                      <img src={b.avatarUrl} alt={b.username} className="w-full h-full object-cover" />
                    ) : (
                      <Ban className="w-6 h-6 text-red-400 opacity-60" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-base text-[var(--color-seda-milharal)]">
                      {b.username}
                    </h4>
                    <p className="font-outfit text-xs text-red-400/70">
                      Bloqueado • {b.friendCode || 'Viajante'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(b.id, b.username)}
                  tabIndex={0}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 text-[var(--color-seda-milharal)] font-outfit text-sm font-semibold transition cursor-pointer tv-focus-glow min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear</span>
                </button>
              </GlassPanel>
            ))
          )}
        </div>
      )}
    </div>
  );
};
