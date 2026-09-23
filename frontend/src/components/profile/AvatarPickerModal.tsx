import React, { useState, useRef } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { X, Check, RotateCcw, Upload, Camera } from 'lucide-react';

export const PRESET_AVATARS = [
  { id: 'oracle', name: 'Oráculo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AkashaOracle' },
  { id: 'voyager', name: 'Viajante', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicVoyager' },
  { id: 'cinephile', name: 'Cinéfilo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CinematicSoul' },
  { id: 'arcane', name: 'Arcano', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ArcaneScholar' },
  { id: 'knight', name: 'Guardião', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberKnight' },
  { id: 'stargazer', name: 'Estelar', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=StarGazer' },
];

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  defaultOAuthAvatar?: string | null;
  onSelectAvatar: (url: string | null) => Promise<void>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  defaultOAuthAvatar,
  onSelectAvatar,
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleApplyPreset = async (url: string) => {
    setIsApplying(true);
    setErrorMsg(null);
    try {
      await onSelectAvatar(url);
      onClose();
    } catch {
      setErrorMsg('Falha ao aplicar imagem.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('A imagem original não pode ultrapassar 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const startX = (img.width - minDim) / 2;
            const startY = (img.height - minDim) / 2;
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
            const processedUrl = canvas.toDataURL('image/jpeg', 0.85);
            setFilePreview(processedUrl);
          } else {
            setFilePreview(dataUrl);
          }
          setErrorMsg(null);
        } catch {
          setFilePreview(dataUrl);
          setErrorMsg(null);
        }
      };
      img.onerror = () => {
        setErrorMsg('Erro ao carregar o arquivo de imagem.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setErrorMsg('Falha ao abrir o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyFile = async () => {
    if (!filePreview) return;
    setIsApplying(true);
    setErrorMsg(null);
    try {
      await onSelectAvatar(filePreview);
      setFilePreview(null);
      onClose();
    } catch {
      setErrorMsg('Falha ao aplicar imagem selecionada.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToOAuth = async () => {
    setIsApplying(true);
    setErrorMsg(null);
    try {
      await onSelectAvatar(defaultOAuthAvatar || null);
      onClose();
    } catch {
      setErrorMsg('Falha ao restaurar foto padrão.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <GlassPanel
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6 border border-white/20 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-cinzel text-xl font-bold text-[var(--color-caramelo-claro)]">
              Foto de Perfil
            </h3>
            <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60">
              Escolha um avatar temático, envie uma foto ou use um link externo.
            </p>
          </div>
          <button
            onClick={onClose}
            tabIndex={0}
            aria-label="Fechar"
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition tv-focus-glow cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-outfit">
            {errorMsg}
          </div>
        )}

        {/* Upload de Imagem do Dispositivo (Mobile / Desktop) */}
        <div className="flex flex-col gap-2">
          <span className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-70 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Camera size={14} className="text-[var(--color-caramelo-claro)]" />
            Foto do Dispositivo
          </span>

          {filePreview ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-[var(--color-caramelo-claro)]/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-caramelo-claro)] bg-black/60 flex-shrink-0">
                  <img src={filePreview} alt="Prévia da foto" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-outfit text-xs font-semibold text-[var(--color-seda-milharal)]">
                    Foto Selecionada
                  </p>
                  <p className="font-outfit text-[10px] text-white/50">Pronta para aplicar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyFile}
                  disabled={isApplying}
                  tabIndex={0}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-caramelo-claro)] text-black font-outfit text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition tv-focus-glow cursor-pointer min-h-[36px]"
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setFilePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  tabIndex={0}
                  aria-label="Cancelar seleção"
                  className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition tv-focus-glow cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="avatar-file-upload"
              />
              <label
                htmlFor="avatar-file-upload"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-[var(--color-caramelo-claro)] bg-black/30 hover:bg-white/5 text-[var(--color-seda-milharal)] hover:text-white font-outfit text-xs font-medium transition cursor-pointer tv-focus-glow min-h-[44px]"
              >
                <Upload size={16} className="text-[var(--color-caramelo-claro)]" />
                <span>Escolher Imagem do Computador ou Celular</span>
              </label>
            </div>
          )}
        </div>

        {/* Galeria de Avatares Akasha (Otimizado para TV D-Pad) */}
        <div>
          <span className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-70 uppercase tracking-wider font-semibold block mb-3">
            Avatares Temáticos Akasha
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PRESET_AVATARS.map(avatar => {
              const isSelected = currentAvatarUrl === avatar.url;
              return (
                <button
                  key={avatar.id}
                  onClick={() => handleApplyPreset(avatar.url)}
                  disabled={isApplying}
                  tabIndex={0}
                  title={avatar.name}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition tv-focus-glow cursor-pointer group ${
                    isSelected
                      ? 'border-[var(--color-caramelo-claro)] bg-[var(--color-caramelo-claro)]/20 scale-105'
                      : 'border-white/10 hover:border-white/30 bg-black/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-black/50 relative flex items-center justify-center">
                    <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check size={16} className="text-[var(--color-caramelo-claro)]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-outfit text-[var(--color-seda-milharal)] opacity-80 truncate max-w-full">
                    {avatar.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Restaurar para a Foto Original da Conta */}
        {defaultOAuthAvatar && (
          <div className="pt-2 border-t border-white/10 flex justify-end">
            <button
              onClick={handleResetToOAuth}
              disabled={isApplying}
              tabIndex={0}
              className="flex items-center gap-2 text-xs font-outfit text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:text-[var(--color-caramelo-claro)] transition tv-focus-glow cursor-pointer py-1 min-h-[36px]"
            >
              <RotateCcw size={14} />
              <span>Restaurar foto original da conta Google</span>
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
