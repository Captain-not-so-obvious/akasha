import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ArrowLeft, Shield, Lock, Eye, Download, Trash2, Cpu } from 'lucide-react';
import { CURRENT_PRIVACY_VERSION } from '../lib/legalVersions';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[var(--color-floresta-negra)] text-[var(--color-seda-milharal)] p-4 md:p-8 flex justify-center">
      {/* Background Glows Liquid Glass */}
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[var(--color-folha-oliva)] opacity-15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[var(--color-cobre)] opacity-15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-6">
        {/* Topo / Voltar */}
        <button
          onClick={() => navigate(-1)}
          tabIndex={0}
          aria-label="Voltar para a tela anterior"
          className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2 font-outfit text-sm text-[var(--color-seda-milharal)] transition-colors cursor-pointer border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <GlassPanel className="p-6 md:p-10 space-y-8">
          {/* Cabeçalho */}
          <div className="border-b border-white/10 pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-outfit">
              <Shield className="w-3.5 h-3.5" />
              <span>Conformidade com a LGPD (Lei nº 13.709/2018)</span>
            </div>
            <h1 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wider text-[var(--color-seda-milharal)]">
              Política de Privacidade do Akasha
            </h1>
            <p className="font-outfit text-xs md:text-sm text-[var(--color-seda-milharal)] opacity-70">
              Versão vigente: {CURRENT_PRIVACY_VERSION} • Última atualização: 09 de outubro de 2026
            </p>
          </div>

          {/* 1. Controlador */}
          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              1. Identificação do Controlador e Canal de Comunicação
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              O <strong>Akasha</strong> é um repositório inteligente de entretenimento desenvolvido e mantido por{' '}
              <strong>Fillipe Moreira</strong>, atuando como o Controlador dos dados pessoais na acepção do Art. 5º, VI da LGPD.
            </p>
            <p className="text-sm leading-relaxed opacity-90">
              Para exercer seus direitos de titular, solicitar esclarecimentos ou relatar dúvidas sobre privacidade, utilize o canal direto de atendimento:{' '}
              <a
                href="mailto:fillipemoreira979@gmail.com"
                className="text-amber-300 underline hover:text-amber-200"
                tabIndex={0}
              >
                fillipemoreira979@gmail.com
              </a>.
            </p>
          </section>

          {/* 2. Dados Coletados */}
          <section className="space-y-4 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              2. Dados Coletados e Finalidades
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <Lock className="w-4 h-4" />
                  <span>Conta e Autenticação</span>
                </div>
                <p className="opacity-80 leading-relaxed">
                  E-mail, nome de exibição e avatar importados do Google via login OAuth. Usados estritamente para identificação e segurança de acesso (Art. 7º, V da LGPD).
                </p>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <Eye className="w-4 h-4" />
                  <span>Histórico Cultural e Acervo</span>
                </div>
                <p className="opacity-80 leading-relaxed">
                  Obras que você assiste, joga e lê, além de notas (1 a 5 estrelas) e resenhas. Utilizados para gerenciar sua biblioteca e gerar recomendações personalizadas.
                </p>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <Shield className="w-4 h-4" />
                  <span>Rede Social e Amizades</span>
                </div>
                <p className="opacity-80 leading-relaxed">
                  Lista bilateral de amigos e feed de atividades. Você tem controle total para tornar suas atividades privadas ou ocultar seu perfil de buscas por e-mail.
                </p>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <Cpu className="w-4 h-4" />
                  <span>Conexões Agênticas (MCP)</span>
                </div>
                <p className="opacity-80 leading-relaxed">
                  Quando você autoriza assistentes de IA (como Google Spark ou Claude), concedemos acesso revogável de até 30 dias baseado no seu consentimento explícito (Art. 7º, I).
                </p>
              </div>
            </div>
          </section>

          {/* 3. Perfilamento Cultural */}
          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              3. Decisões Automatizadas e Perfilamento (Art. 20 da LGPD)
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              O Akasha processa suas notas e histórico cultural para inferir arquétipos e sugerir mídias afins (ex.: pontes transmidiáticas entre livros e games). Esse algoritmo opera de forma determinística no servidor, sem envio de dados pessoais a inteligências de terceiros e sem qualquer impacto jurídico ou financeiro negativo sobre você.
            </p>
            <p className="text-sm leading-relaxed opacity-90">
              Você pode, a qualquer instante, configurar seu perfil como <strong>Privado</strong> no painel de privacidade para restringir o compartilhamento social das suas inferências.
            </p>
          </section>

          {/* 4. Transferência Internacional */}
          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              4. Transferência Internacional de Dados (Art. 33 da LGPD)
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              Os servidores de banco de dados do Akasha são operados via <strong>Supabase Inc.</strong> na região de <strong>Oregon, Estados Unidos (us-west-2)</strong>, e a hospedagem de aplicação no <strong>Render Services Inc. (EUA)</strong>.
            </p>
            <p className="text-sm leading-relaxed opacity-90">
              Essa transferência internacional é realizada com amparo no <strong>Art. 33, IX da LGPD</strong> (necessária para a execução de contrato ou de procedimentos preliminares a pedido do titular) e conta com salvaguardas rigorosas de segurança, incluindo tráfego criptografado TLS 1.3 e repouso de dados em PostgreSQL com criptografia AES-256.
            </p>
          </section>

          {/* 5. Direitos do Titular */}
          <section className="space-y-4 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              5. Seus Direitos como Titular (Art. 18 da LGPD)
            </h2>
            <p className="text-sm opacity-90">
              Garantimos a você o pleno exercício dos seus direitos previstos em lei, disponíveis diretamente no seu painel de Perfil ou pelo nosso e-mail:
            </p>

            <ul className="space-y-2 text-sm opacity-90 list-disc list-inside">
              <li>
                <strong>Acesso e Portabilidade (Art. 18, II e V):</strong> Baixe a qualquer momento um arquivo JSON completo com todo o seu acervo, histórico e conexões pelo botão <em>Baixar Meus Dados</em>.
              </li>
              <li>
                <strong>Correção de Dados (Art. 18, III):</strong> Atualize seu nome de usuário, avatar e código de amigo diretamente na tela de Perfil.
              </li>
              <li>
                <strong>Eliminação de Dados (Art. 18, VI):</strong> Exclua definitivamente sua conta e todo o histórico associado a qualquer momento com efeito imediato e em cascata.
              </li>
              <li>
                <strong>Revogação de Consentimento (Art. 18, IX):</strong> Revogue em um clique o acesso de qualquer agente ou IA conectado via MCP.
              </li>
            </ul>
          </section>

          {/* 6. Cookies */}
          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              6. Cookies e Rastreamento
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              O Akasha <strong>não utiliza cookies de rastreamento comercial ou anúncios de terceiros</strong>. Utilizamos exclusivamente cookies estritamente necessários para manter sua sessão autenticada com proteção contra roubo de tokens (<code className="text-amber-300">HttpOnly</code>, <code className="text-amber-300">Secure</code> e <code className="text-amber-300">SameSite</code>).
            </p>
          </section>

          {/* Rodapé da Página */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-outfit opacity-70">
            <span>© 2026 Akasha • Compromisso com a privacidade do viajante</span>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/termos')}
                tabIndex={0}
                className="underline hover:text-white cursor-pointer"
              >
                Termos de Uso
              </button>
              <button
                onClick={() => navigate('/profile')}
                tabIndex={0}
                className="underline hover:text-white cursor-pointer"
              >
                Painel de Privacidade
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};
