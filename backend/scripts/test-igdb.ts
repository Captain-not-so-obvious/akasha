// Script de verificação de conexão com a API IGDB / Twitch
const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET || process.env.IGDB_CLIENT_SECRET;

async function testConnection() {
  console.log('🔍 [1/3] Verificando variáveis de ambiente...');
  if (!clientId || !clientSecret) {
    console.error('❌ ERRO: IGDB_CLIENT_ID (ou TWITCH_CLIENT_ID) / SECRET não estão configurados no backend/.env');
    console.log('Por favor, verifique as linhas no seu backend/.env:');
    console.log('IGDB_CLIENT_ID=seu_client_id');
    console.log('IGDB_CLIENT_SECRET=seu_client_secret');
    process.exit(1);
  }
  console.log(`✅ Variáveis encontradas. Client ID: ${clientId.slice(0, 6)}... (${clientId.length} caracteres)`);

  console.log('\n🔑 [2/3] Solicitando token de acesso OAuth na Twitch...');
  try {
    const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
    const tokenRes = await fetch(tokenUrl, { method: 'POST' });
    
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`❌ ERRO na autenticação da Twitch (${tokenRes.status}):`, errBody);
      process.exit(1);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
    console.log(`✅ Token OAuth obtido com sucesso! Válido por ${Math.round(tokenData.expires_in / 86400)} dias.`);

    console.log('\n🎮 [3/3] Consultando API da IGDB (/v4/games)...');
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'text/plain',
      },
      body: 'fields id, name, first_release_date, total_rating; sort total_rating desc; limit 3;',
    });

    if (!igdbRes.ok) {
      const igdbErr = await igdbRes.text();
      console.error(`❌ ERRO na chamada IGDB (${igdbRes.status}):`, igdbErr);
      process.exit(1);
    }

    const games = (await igdbRes.json()) as Array<{ id: number; name: string; total_rating?: number }>;
    console.log('🎉 SUCESSO! Conexão com a IGDB validada com êxito. Amostra de jogos retornados:');
    games.forEach((g, i) => {
      console.log(`  ${i + 1}. [ID: ${g.id}] ${g.name} (Avaliação: ${g.total_rating ? Math.round(g.total_rating) : 'N/A'}%)`);
    });
    console.log('\n🚀 Seu Akasha está 100% pronto para consumir o catálogo ao vivo da IGDB!');
  } catch (err: unknown) {
    console.error('❌ Falha na comunicação de rede:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

testConnection();
