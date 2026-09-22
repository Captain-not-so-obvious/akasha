# Contexto e Escopo do Projeto: Akasha

> 📄 **Especificação Técnica de Expansão (Módulos Universais):** [`specs/SPEC-001-universal-media-expansion.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-001-universal-media-expansion.md)

## 1. Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                         │
│     Universal (Android TV D-Pad, Mobile Touch, Desktop Responsive)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend API (Fastify)                           │
│          TypeScript + Zod + Auth BFF (HttpOnly) + Servidor MCP         │
└───────┬───────────────┬───────────────────┬───────────────────┬────────┘
        │               │                   │                   │
        ▼               ▼                   ▼                   ▼
┌──────────────┐ ┌──────────────┐   ┌───────────────┐   ┌───────────────┐
│   TMDB API   │ │   IGDB API   │   │ Google Books  │   │  Comic Vine   │
│(Filmes/Séries│ │   (Games)    │   │   (Livros)    │   │   & AniList   │
│   pt-BR)     │ │ Twitch OAuth │   │    pt-BR      │   │ (HQs/Mangás)  │
└──────────────┘ └──────────────┘   └───────────────┘   └───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │      Prisma ORM       │
                        │ (Type-safe DB Client) │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   Supabase Cloud DB   │
                        │PostgreSQL + Auth OAuth│
                        └───────────────────────┘
```

### Decisões de Stack e Justificativas

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | React + Vite | SPA moderna, ecossistema rico, compatibilidade total com Capacitor (Android TV) |
| **Framework Backend** | **Fastify** | Alta performance, tipagem TypeScript de primeira classe, suporte nativo a plugins e MCP |
| **Linguagem Backend** | **TypeScript** | Rigor estrito de tipos (`no-any`), prevenção de erros em tempo de compilação |
| **Validação de Input** | **Zod** | Schemas compartilhados e inferência direta de tipos TypeScript |
| **ORM** | **Prisma** | Schema declarativo, migrations controladas e tipagem estrita com Postgres |
| **Banco de Dados** | **Supabase (PostgreSQL)** | PostgreSQL relacional, RLS (Row Level Security), Auth OAuth e suporte a JSONB para metadados |
| **Catálogo Filmes/Séries** | **TMDB API** | Dados completos com suporte a `pt-BR` e imagens |
| **Catálogo Jogos** | **IGDB API (Twitch)** | Padrão ouro da indústria, `similar_games`, gêneros e estúdios |
| **Catálogo Livros** | **Google Books API** | Maior acervo pt-BR, busca por ISBN e assuntos literários |
| **Catálogo Quadrinhos** | **Comic Vine + AniList** | Cobertura de HQs ocidentais (volumes/arcos) e mangás/manhwas |
| **Deploy Frontend** | Vercel / Netlify | CI/CD automático via GitHub, CDN global |
| **Deploy Backend** | Render | Suporte a Node.js/TypeScript, deploy via GitHub |

> **Nota sobre Prisma vs Drizzle:** Prisma foi escolhido por ser o ORM TypeScript mais adotado no mercado atualmente e por ter a curva de aprendizado mais suave para quem está migrando de outras linguagens. O schema declarativo (arquivo `.prisma`) é intuitivo e similar ao Django ORM conceitualmente. Drizzle é uma alternativa excelente e mais próxima do SQL puro, mas Prisma é o passo natural para um primeiro projeto em TypeScript.

---

## 2. Modelagem do Banco de Dados

### 2.1 Schema do Prisma (`prisma/schema.prisma`)

O schema do Prisma é a **fonte da verdade** do banco. Ao rodar `prisma generate`, ele auto-gera um client TypeScript com tipos seguros para todas as operações no banco.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profile {
  id         String      @id @db.Uuid
  username   String?     @unique
  avatarUrl  String?     @map("avatar_url")
  updatedAt  DateTime    @default(now()) @updatedAt @map("updated_at")
  wishlists  Wishlist[]

  @@map("profiles")
}

enum MediaType {
  movie
  tv
}

enum WatchStatus {
  plan_to_watch
  watching
  completed
  dropped
}

model Wishlist {
  id         Int         @id @default(autoincrement())
  userId     String      @map("user_id") @db.Uuid
  tmdbId     Int         @map("tmdb_id")
  mediaType  MediaType   @map("media_type")
  status     WatchStatus @default(plan_to_watch)
  userRating Int?        @map("user_rating") // 1-10, validado via Zod no backend
  notes      String?
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @default(now()) @updatedAt @map("updated_at")
  profile    Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, tmdbId, mediaType]) // Evita duplicatas
  @@map("wishlist")
}
```

### 2.2 SQL Complementar: Row Level Security (RLS) no Supabase

O RLS é configurado diretamente no painel do Supabase via SQL. Garante que um usuário autenticado só acesse seus próprios dados, mesmo que a query venha de um client mal configurado.

```sql
-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Políticas para a Wishlist
CREATE POLICY "Usuários podem visualizar os próprios itens"
    ON public.wishlist FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir os próprios itens"
    ON public.wishlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar os próprios itens"
    ON public.wishlist FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar os próprios itens"
    ON public.wishlist FOR DELETE
    USING (auth.uid() = user_id);
```

> **Por que usar RLS mesmo com backend próprio?** O backend valida o JWT e filtra por `userId` nas queries do Prisma. O RLS é uma camada de defesa em profundidade — se houver um bug no backend que esqueça de filtrar por usuário, o banco rejeita a query automaticamente.

---

## 3. Estrutura do Repositório

Monorepo com `backend/` e `frontend/` no mesmo repositório GitHub para facilitar o gerenciamento.

```
minha-wishlist/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Lint + type-check automático no PR
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Fonte da verdade do banco
│   │   └── migrations/             # Gerado automaticamente pelo Prisma
│   ├── src/
│   │   ├── routes/
│   │   │   ├── wishlist.routes.ts  # GET /wishlist, POST /wishlist, PATCH /:id, DELETE /:id
│   │   │   └── tmdb.routes.ts      # GET /tmdb/search, GET /tmdb/:type/:id
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts  # Valida JWT do Supabase, injeta userId na request
│   │   ├── services/
│   │   │   ├── wishlist.service.ts # Lógica de negócio + queries Prisma
│   │   │   └── tmdb.service.ts     # Integração com a API do TMDB
│   │   ├── schemas/
│   │   │   └── wishlist.schema.ts  # Schemas Zod para validação de input
│   │   ├── types/
│   │   │   └── index.ts            # Tipos de domínio e extensões do Fastify
│   │   ├── lib/
│   │   │   └── prisma.ts           # Instância singleton do PrismaClient
│   │   └── server.ts               # Entrypoint: configuração do Fastify
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

---

## 4. Implementação do Backend TypeScript

### 4.1 Schemas de Validação com Zod (`src/schemas/wishlist.schema.ts`)

O Zod valida os dados que chegam nas rotas **antes** de tocar no banco. Um ponto fundamental: o tipo TypeScript é inferido automaticamente do schema — você não escreve o tipo manualmente.

```typescript
import { z } from 'zod';

// Zod infere o tipo TypeScript automaticamente — não precisa criar uma interface separada
export const createWishlistItemSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).default('plan_to_watch'),
  userRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export const updateWishlistItemSchema = z.object({
  status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).optional(),
  userRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

// Tipos inferidos do Zod — usados nas assinaturas de função e no Prisma
export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;
```

### 4.2 Middleware de Autenticação (`src/middlewares/auth.middleware.ts`)

Valida o JWT emitido pelo Supabase e injeta o `userId` na requisição. Todas as rotas protegidas usam este hook.

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

// Estende o tipo do Fastify para incluir userId sem usar 'any'
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token de autenticação ausente.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
    request.userId = payload.sub; // UUID do usuário autenticado
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}
```

### 4.3 Instância do Prisma (`src/lib/prisma.ts`)

Padrão singleton obrigatório em TypeScript para evitar múltiplas conexões ao banco durante hot-reload no desenvolvimento.

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton: uma única instância em toda a aplicação
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 4.4 Rota da Wishlist (`src/routes/wishlist.routes.ts`)

Exemplo de rota completa com Fastify + Zod + Prisma + autenticação. Note a ausência de `any` — TypeScript garante segurança em todo o fluxo.

```typescript
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createWishlistItemSchema, updateWishlistItemSchema } from '../schemas/wishlist.schema.js';

export async function wishlistRoutes(fastify: FastifyInstance) {
  // Protege todas as rotas deste plugin com o middleware de auth
  fastify.addHook('preHandler', authMiddleware);

  // GET /wishlist — Lista os itens do usuário autenticado
  fastify.get('/', async (request, reply) => {
    const items = await prisma.wishlist.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(items);
  });

  // POST /wishlist — Adiciona um item
  fastify.post('/', async (request, reply) => {
    const parsed = createWishlistItemSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    const item = await prisma.wishlist.create({
      data: { ...parsed.data, userId: request.userId },
    });

    return reply.status(201).send(item);
  });

  // PATCH /wishlist/:id — Atualiza status, nota ou avaliação
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateWishlistItemSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const item = await prisma.wishlist.update({
        where: { id: Number(id), userId: request.userId }, // userId garante que só atualiza o próprio item
        data: parsed.data,
      });
      return reply.send(item);
    } catch {
      return reply.status(404).send({ error: 'Item não encontrado.' });
    }
  });

  // DELETE /wishlist/:id — Remove um item
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.wishlist.delete({
        where: { id: Number(id), userId: request.userId },
      });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Item não encontrado.' });
    }
  });
}
```

### 4.5 Serviço TMDB (`src/services/tmdb.service.ts`)

Tipagem forte na integração com a API externa. Evita erros de propriedades inexistentes em tempo de execução.

```typescript
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Tipos das respostas relevantes da API do TMDB
interface TmdbMediaDetails {
  id: number;
  title?: string;       // Filmes usam 'title'
  name?: string;        // Séries usam 'name'
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
}

export async function fetchMediaDetails(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaDetails | null> {
  const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?language=pt-BR`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro TMDB: ${response.status}`);
    }

    const data: TmdbMediaDetails = await response.json();

    return {
      id: data.id,
      title: data.title ?? data.name ?? 'Título indisponível',
      overview: data.overview || 'Sinopse não disponível em português.',
      posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      releaseDate: data.release_date ?? data.first_air_date ?? null,
    };
  } catch (error) {
    console.error('Falha ao integrar com TMDB:', error);
    return null;
  }
}
```

### 4.6 Entrypoint do Servidor (`src/server.ts`)

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wishlistRoutes } from './routes/wishlist.routes.js';
import { tmdbRoutes } from './routes/tmdb.routes.js';

const fastify = Fastify({ logger: true });

// CORS: permite apenas o domínio do frontend em produção
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});

// Registro de rotas com prefixo
await fastify.register(wishlistRoutes, { prefix: '/wishlist' });
await fastify.register(tmdbRoutes, { prefix: '/tmdb' });

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

const PORT = Number(process.env.PORT) || 3000;

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
```

---

## 5. Fluxo de Autenticação OAuth via Supabase (BFF + HttpOnly Cookies)

Para mitigar vulnerabilidades de XSS e evitar que tokens fiquem expostos no `localStorage`, o Akasha implementa o padrão Backend-for-Frontend (BFF). O Frontend nunca lê o token de acesso.

```
[ Usuário ] ──► [ Botão "Login" ] ──► [ Supabase OAuth ]
                                            │
[ React App ] ◄── [ Redirect + JWT ] ───────┘
     │
     └──► POST /auth/session (Envia tokens para o Backend)
                │
                └──► [ Backend guarda Access Token e Refresh Token
                       em Cookies HttpOnly, Secure, SameSite=Lax ]
                              │
[ React App ] ◄── [ Todas as chamadas subsequentes enviam o Cookie 
                    automaticamente via credentials: 'include' ]
                              │
                    [ Backend lê request.cookies e 
                      valida JWT no Middleware ]
```

### Configuração no Frontend (React)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Usamos inMemoryStorage para que o token nunca seja persistido 
// do lado do cliente (proteção contra XSS)
const inMemoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: inMemoryStorage,
      persistSession: false
    }
  }
);
```

As chamadas ao backend nas rotas protegidas não utilizam mais o header `Authorization`, passando a utilizar `credentials: 'include'` no `fetch` nativo.

```typescript
const res = await fetch(`${BACKEND_URL}/wishlist`, {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Envia os cookies HttpOnly
});
```

---

## 6. Variáveis de Ambiente

### Frontend (`frontend/.env.example`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_URL=http://localhost:3000
```

### Backend (`backend/.env.example`)

```env
# Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Banco de dados (Prisma conecta via esta URL)
DATABASE_URL=postgresql://postgres:senha@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres

# TMDB — usar Bearer Token (mais seguro que API Key)
TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...

# Supabase — usado para validar JWT no middleware de auth
SUPABASE_JWT_SECRET=seu_jwt_secret_aqui
```

> **Onde encontrar o `SUPABASE_JWT_SECRET`:** Painel do Supabase → Settings → API → JWT Settings → JWT Secret.

---

## 7. Dependências do Backend

### `package.json` (backend)

```json
{
  "dependencies": {
    "@fastify/cors": "^9.0.0",
    "@prisma/client": "^5.0.0",
    "fastify": "^4.0.0",
    "jsonwebtoken": "^9.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.0.0",
    "prisma": "^5.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

### `tsconfig.json` (backend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 8. Guia de Deploy (CI/CD via GitHub)

### Passo 1: Preparação do Banco

```bash
# Gerar o cliente Prisma a partir do schema
cd backend
npx prisma generate

# Criar e aplicar a primeira migration
npx prisma migrate dev --name init

# Aplicar o RLS manualmente no Supabase SQL Editor (seção 2.2 deste documento)
```

### Passo 2: Deploy do Backend no Render

1. Conecte sua conta GitHub ao [Render](https://render.com).
2. Crie um **New Web Service** apontando para o repositório.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run db:generate && npm run build`
   - **Start Command:** `npm start`
4. Adicione todas as variáveis do `backend/.env.example` em **Environment**.
5. Cada `git push` na `main` dispara o redeploy automaticamente.

### Passo 3: Deploy do Frontend na Vercel

1. Importe o repositório na [Vercel](https://vercel.com).
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
3. Adicione as variáveis do `frontend/.env.example`, substituindo `VITE_BACKEND_URL` pela URL gerada pelo Render.
4. Clique em **Deploy**.

---

## 9. Fluxo de Desenvolvimento Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/minha-wishlist.git
cd minha-wishlist

# 2. Configure o backend
cd backend
cp .env.example .env
# Edite .env com suas credenciais do Supabase e TMDB
npm install
npm run db:generate
npm run dev  # Servidor rodando em http://localhost:3000

# 3. Em outro terminal, configure o frontend
cd ../frontend
cp .env.example .env
# Edite .env com suas credenciais do Supabase
npm install
npm run dev  # App rodando em http://localhost:5173
```