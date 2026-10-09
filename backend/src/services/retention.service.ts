import { prisma } from '../lib/prisma.js';

export const OAUTH_CODE_RETENTION_HOURS = 24;
export const READ_NOTIFICATIONS_RETENTION_DAYS = 90;
export const REVOKED_MCP_GRANTS_RETENTION_DAYS = 30;

/**
 * Expurgador automático de dados temporários e obsoletos em atendimento
 * ao Princípio da Necessidade e Retenção Limitada (LGPD Art. 15 e Art. 16).
 */
export async function purgeExpiredData(): Promise<{
  purgedOAuthCodes: number;
  purgedNotifications: number;
  purgedMcpGrants: number;
}> {
  const now = new Date();

  // 1. Códigos OAuth utilizados ou expirados há mais de 24h
  const oauthThreshold = new Date(now.getTime() - OAUTH_CODE_RETENTION_HOURS * 60 * 60 * 1000);
  const deletedCodes = await prisma.oAuthCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: oauthThreshold } },
        { used: true, createdAt: { lt: oauthThreshold } },
      ],
    },
  });

  // 2. Notificações lidas há mais de 90 dias
  const notificationsThreshold = new Date(
    now.getTime() - READ_NOTIFICATIONS_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: notificationsThreshold },
    },
  });

  // 3. Concessões MCP revogadas há mais de 30 dias
  const mcpThreshold = new Date(
    now.getTime() - REVOKED_MCP_GRANTS_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const deletedGrants = await prisma.mcpGrant.deleteMany({
    where: {
      revokedAt: { not: null, lt: mcpThreshold },
    },
  });

  return {
    purgedOAuthCodes: deletedCodes.count,
    purgedNotifications: deletedNotifications.count,
    purgedMcpGrants: deletedGrants.count,
  };
}

/**
 * Inicializa a rotina periódica de expurgo a cada 24 horas sem bloquear o encerramento do processo.
 */
export function initRetentionSchedule(logger?: { info: (msg: string, meta?: unknown) => void }): NodeJS.Timeout {
  // Executa uma vez no boot
  purgeExpiredData()
    .then((result) => {
      logger?.info('[Retenção LGPD] Limpeza inicial de dados concluída', result);
    })
    .catch((err) => {
      logger?.info('[Retenção LGPD] Falha na limpeza inicial de dados', { err });
    });

  // Repete a cada 24 horas
  const interval = setInterval(() => {
    purgeExpiredData()
      .then((result) => {
        logger?.info('[Retenção LGPD] Ciclo diário de retenção concluído', result);
      })
      .catch((err) => {
        logger?.info('[Retenção LGPD] Falha no ciclo diário de retenção', { err });
      });
  }, 24 * 60 * 60 * 1000);

  interval.unref();
  return interval;
}
