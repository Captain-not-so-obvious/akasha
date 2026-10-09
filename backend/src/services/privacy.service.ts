import { prisma } from '../lib/prisma.js';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '../lib/legalVersions.js';
import { UpdatePrivacySettingsInput } from '../schemas/privacy.schema.js';

export interface UserDataExport {
  exportMetadata: {
    exportDate: string;
    formatVersion: string;
    controller: string;
    contactEmail: string;
    legalGround: string;
  };
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    friendCode: string | null;
    activityVisibility: string;
    discoverableByEmail: boolean;
    updatedAt: Date;
  };
  library: Array<{
    domain: string;
    externalId: string;
    title: string;
    status: string;
    userRating: number | null;
    notes: string | null;
    releaseYear: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  activities: Array<{
    type: string;
    domain: string;
    title: string | null;
    userRating: number | null;
    status: string | null;
    review: string | null;
    createdAt: Date;
  }>;
  friends: Array<{
    friendshipId: number;
    friendUsername: string;
    friendsSince: Date;
  }>;
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
  }>;
  mcpConnections: Array<{
    id: string;
    clientId: string;
    scope: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }>;
  consents: Array<{
    document: string;
    version: string;
    acceptedAt: Date;
  }>;
}

/**
 * Coleta e consolida a totalidade dos dados pessoais do titular para atendimento
 * ao Direito de Acesso e Portabilidade (LGPD Art. 18, II e V).
 * Garante a privacidade de terceiros: amigos são referenciados apenas pelo nome público.
 */
export async function exportUserData(userId: string): Promise<UserDataExport | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      wishlists: true,
      activities: {
        orderBy: { createdAt: 'desc' },
      },
      sentFriendships: {
        where: { status: 'accepted' },
        include: {
          addressee: { select: { username: true } },
        },
      },
      receivedFriendships: {
        where: { status: 'accepted' },
        include: {
          requester: { select: { username: true } },
        },
      },
      notifications: {
        orderBy: { createdAt: 'desc' },
      },
      mcpGrants: {
        orderBy: { createdAt: 'desc' },
      },
      consentRecords: {
        orderBy: { acceptedAt: 'desc' },
      },
    },
  });

  if (!profile) return null;

  const friendsList = [
    ...profile.sentFriendships.map((f) => ({
      friendshipId: f.id,
      friendUsername: f.addressee.username || 'Viajante Akasha',
      friendsSince: f.updatedAt,
    })),
    ...profile.receivedFriendships.map((f) => ({
      friendshipId: f.id,
      friendUsername: f.requester.username || 'Viajante Akasha',
      friendsSince: f.updatedAt,
    })),
  ];

  return {
    exportMetadata: {
      exportDate: new Date().toISOString(),
      formatVersion: '1.0.0-lgpd',
      controller: 'Fillipe Moreira (Akasha)',
      contactEmail: 'fillipemoreira979@gmail.com',
      legalGround: 'Lei Geral de Proteção de Dados (Lei nº 13.709/2018), Art. 18, II e V',
    },
    profile: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      friendCode: profile.friendCode,
      activityVisibility: profile.activityVisibility,
      discoverableByEmail: profile.discoverableByEmail,
      updatedAt: profile.updatedAt,
    },
    library: profile.wishlists.map((w) => ({
      domain: w.domain,
      externalId: w.externalId,
      title: w.title,
      status: w.status,
      userRating: w.userRating,
      notes: w.notes,
      releaseYear: w.releaseYear,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    activities: profile.activities.map((a) => ({
      type: a.type,
      domain: a.domain,
      title: a.title,
      userRating: a.userRating,
      status: a.status,
      review: a.review,
      createdAt: a.createdAt,
    })),
    friends: friendsList,
    notifications: profile.notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
    })),
    mcpConnections: profile.mcpGrants.map((g) => ({
      id: g.id,
      clientId: g.clientId,
      scope: g.scope,
      createdAt: g.createdAt,
      lastUsedAt: g.lastUsedAt,
      revokedAt: g.revokedAt,
    })),
    consents: profile.consentRecords.map((c) => ({
      document: c.document,
      version: c.version,
      acceptedAt: c.acceptedAt,
    })),
  };
}

/**
 * Exclui de forma definitiva e irreversível todos os dados do titular (LGPD Art. 18, VI).
 * Cascade relacional no Postgres remove wishlist, atividades, amizades, notificações e conexões.
 * Se configurada a chave de serviço do Supabase, remove também o registro de autenticação.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  // 1. Tentar excluir usuário no Supabase Auth se houver service role key
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });
    } catch {
      // Continua para assegurar a deleção no banco de dados da aplicação
    }
  }

  // 2. Excluir perfil no banco relacional (Cascade remove tabelas filhas)
  await prisma.profile.delete({
    where: { id: userId },
  });
}

/**
 * Lista as conexões MCP autorizadas para o titular (LGPD Art. 18, VII).
 */
export async function listUserMcpConnections(userId: string) {
  return prisma.mcpGrant.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: {
      id: true,
      clientId: true,
      scope: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoga de forma imediata o acesso de uma IA/agente MCP (LGPD Art. 18, IX e Art. 8º §5).
 */
export async function revokeUserMcpConnection(userId: string, grantId: string): Promise<boolean> {
  const grant = await prisma.mcpGrant.findFirst({
    where: { id: grantId, userId },
  });

  if (!grant) return false;

  await prisma.mcpGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date() },
  });

  return true;
}

/**
 * Consulta as preferências de privacidade do titular.
 */
export async function getUserPrivacySettings(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      activityVisibility: true,
      discoverableByEmail: true,
    },
  });

  if (!profile) return null;

  return {
    activityVisibility: profile.activityVisibility,
    discoverableByEmail: profile.discoverableByEmail,
  };
}

/**
 * Atualiza as preferências de privacidade do titular.
 */
export async function updateUserPrivacySettings(userId: string, input: UpdatePrivacySettingsInput) {
  const updated = await prisma.profile.update({
    where: { id: userId },
    data: {
      ...(input.activityVisibility ? { activityVisibility: input.activityVisibility } : {}),
      ...(input.discoverableByEmail !== undefined ? { discoverableByEmail: input.discoverableByEmail } : {}),
    },
    select: {
      activityVisibility: true,
      discoverableByEmail: true,
    },
  });

  return updated;
}

/**
 * Registra o consentimento/aceite formal do titular a um documento legal (LGPD Art. 8º §2).
 */
export async function recordUserConsent(userId: string, document: 'terms' | 'privacy', version: string) {
  return prisma.consentRecord.create({
    data: {
      userId,
      document,
      version,
    },
  });
}

/**
 * Identifica se há termos ou políticas vigentes pendentes de aceite pelo titular.
 */
export async function getPendingConsents(userId: string): Promise<{ pending: string[] }> {
  const [hasTerms, hasPrivacy] = await Promise.all([
    prisma.consentRecord.findFirst({
      where: {
        userId,
        document: 'terms',
        version: CURRENT_TERMS_VERSION,
      },
    }),
    prisma.consentRecord.findFirst({
      where: {
        userId,
        document: 'privacy',
        version: CURRENT_PRIVACY_VERSION,
      },
    }),
  ]);

  const pending: string[] = [];
  if (!hasTerms) pending.push('terms');
  if (!hasPrivacy) pending.push('privacy');

  return { pending };
}
