import { FastifyPluginAsync } from 'fastify';
import { verifySupabaseAuth } from '../middlewares/auth.middleware.js';
import {
  updatePrivacySettingsSchema,
  acceptConsentSchema,
  deleteAccountSchema,
  connectionParamSchema,
} from '../schemas/privacy.schema.js';
import {
  exportUserData,
  deleteUserAccount,
  listUserMcpConnections,
  revokeUserMcpConnection,
  getUserPrivacySettings,
  updateUserPrivacySettings,
  recordUserConsent,
  getPendingConsents,
} from '../services/privacy.service.js';

export const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas de privacidade exigem autenticação prévia
  fastify.addHook('preHandler', verifySupabaseAuth);

  // 1. Exportação de dados do titular (LGPD Art. 18, II e V)
  fastify.get('/export', async (request, reply) => {
    const data = await exportUserData(request.userId);

    if (!data) {
      return reply.status(404).send({ error: 'Perfil não encontrado para exportação.' });
    }

    const filename = `akasha-dados-pessoais-${request.userId}.json`;
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Type', 'application/json; charset=utf-8');

    return reply.send(data);
  });

  // 2. Exclusão definitiva de conta (LGPD Art. 18, VI)
  fastify.delete('/account', async (request, reply) => {
    const parseResult = deleteAccountSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Confirmação inválida. Envie { confirmation: "EXCLUIR" } para prosseguir com a exclusão.',
      });
    }

    await deleteUserAccount(request.userId);

    // Limpa cookies HttpOnly de sessão
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };

    reply.clearCookie('access_token', cookieOptions);
    reply.clearCookie('refresh_token', cookieOptions);

    return reply.send({
      success: true,
      message: 'Sua conta e todos os seus dados associados foram excluídos com sucesso.',
    });
  });

  // 3. Listar conexões com agentes de IA / MCP (LGPD Art. 18, VII)
  fastify.get('/connections', async (request, reply) => {
    const connections = await listUserMcpConnections(request.userId);
    return reply.send(connections);
  });

  // 4. Revogar acesso de agente MCP (LGPD Art. 18, IX e Art. 8º §5)
  fastify.delete('/connections/:id', async (request, reply) => {
    const paramResult = connectionParamSchema.safeParse(request.params);

    if (!paramResult.success) {
      return reply.status(400).send({ error: 'ID de conexão inválido.' });
    }

    const success = await revokeUserMcpConnection(request.userId, paramResult.data.id);

    if (!success) {
      return reply.status(404).send({ error: 'Conexão não encontrada ou já revogada.' });
    }

    return reply.send({
      success: true,
      message: 'Acesso do aplicativo à sua conta foi revogado imediatamente.',
    });
  });

  // 5. Consultar configurações de privacidade
  fastify.get('/settings', async (request, reply) => {
    const settings = await getUserPrivacySettings(request.userId);

    if (!settings) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    return reply.send(settings);
  });

  // 6. Atualizar configurações de privacidade
  fastify.patch('/settings', async (request, reply) => {
    const parseResult = updatePrivacySettingsSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados de configuração inválidos.',
        details: parseResult.error.format(),
      });
    }

    const updated = await updateUserPrivacySettings(request.userId, parseResult.data);
    return reply.send({
      success: true,
      settings: updated,
      message: 'Preferências de privacidade salvas com sucesso.',
    });
  });

  // 7. Consultar pendências de consentimento
  fastify.get('/consent', async (request, reply) => {
    const result = await getPendingConsents(request.userId);
    return reply.send(result);
  });

  // 8. Registrar aceite formal de consentimento (LGPD Art. 8º §2)
  fastify.post('/consent', async (request, reply) => {
    const parseResult = acceptConsentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados de aceite inválidos.',
        details: parseResult.error.format(),
      });
    }

    const record = await recordUserConsent(
      request.userId,
      parseResult.data.document,
      parseResult.data.version
    );

    return reply.status(201).send({
      success: true,
      consentId: record.id,
      message: 'Aceite registrado com sucesso.',
    });
  });
};
