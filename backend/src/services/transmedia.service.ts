import { prisma } from '../lib/prisma.js';
import {
  TransmediaDomain,
  TransmediaRecommendationItem,
  ArchiveStatsResponse,
} from '../schemas/transmedia.schema.js';
import { searchMedia, MediaDetails } from './tmdb.service.js';
import { searchGames } from './igdb.service.js';
import { searchBooks } from './books.service.js';
import { searchComics } from './comics.service.js';

export interface FranchiseCanonicalMedia {
  externalId: string;
  domain: TransmediaDomain;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
  creatorOrAuthor?: string;
  overview?: string;
  mediaType?: 'movie' | 'tv';
  extraMeta?: Record<string, unknown>;
  legacyExternalIds?: string[];
}

export interface CanonicalFranchise {
  id: string;
  name: string;
  aliases: string[];
  medias: FranchiseCanonicalMedia[];
}

export const CANONICAL_FRANCHISES: CanonicalFranchise[] = [
  {
    id: 'witcher',
    name: 'The Witcher',
    aliases: ['witcher', 'o bruxo', 'geralt de rivia', 'wild hunt'],
    medias: [
      {
        externalId: '1942',
        domain: 'game',
        title: 'The Witcher 3: Wild Hunt',
        releaseYear: 2015,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg',
        creatorOrAuthor: 'CD Projekt RED',
        overview: 'RPG de ação em mundo aberto estrelado pelo caçador de monstros Geralt de Rívia.',
      },
      {
        externalId: 'nOEHU-Y_UHsC',
        legacyExternalIds: ['yv_2DwAAQBAJ'],
        domain: 'book',
        title: 'O Último Desejo (Saga O Bruxo - Vol. 1)',
        releaseYear: 1993,
        coverUrl: 'https://books.google.com/books/content?id=nOEHU-Y_UHsC&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        creatorOrAuthor: 'Andrzej Sapkowski',
        overview: 'A coletânea inaugural de contos de Andrzej Sapkowski que deu origem ao universo do Bruxo.',
      },
      {
        externalId: '71912',
        domain: 'tv',
        title: 'The Witcher',
        mediaType: 'tv',
        releaseYear: 2019,
        coverUrl: 'https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg',
        creatorOrAuthor: 'Lauren Schmidt Hissrich',
        overview: 'Adaptação seriada de fantasia da Netflix com Geralt de Rívia, Yennefer e Ciri.',
      },
      {
        externalId: 'cv-4050-72439',
        legacyExternalIds: ['cv-witcher-1'],
        domain: 'comic',
        title: 'The Witcher: House of Glass',
        releaseYear: 2014,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/3860471-the-witcher-house-of-glass-01.jpg',
        creatorOrAuthor: 'Paul Tobin & Joe Querio (Dark Horse)',
        overview: 'Minissérie em quadrinhos oficial da Dark Horse que expande a jornada de Geralt.',
      },
    ],
  },
  {
    id: 'dune',
    name: 'Duna (Dune)',
    aliases: ['duna', 'dune', 'arrakis', 'paul atreides', 'frank herbert'],
    medias: [
      {
        externalId: '438631',
        domain: 'movie',
        title: 'Duna',
        mediaType: 'movie',
        releaseYear: 2021,
        coverUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        creatorOrAuthor: 'Denis Villeneuve',
        overview: 'Adaptação cinematográfica épica da clássica ficção científica de Frank Herbert.',
      },
      {
        externalId: 'AQk_EAAAQBAJ',
        legacyExternalIds: ['kC40DwAAQBAJ'],
        domain: 'book',
        title: 'Duna (Volume 1)',
        releaseYear: 1965,
        coverUrl: 'https://books.google.com/books/content?id=AQk_EAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        creatorOrAuthor: 'Frank Herbert',
        overview: 'A obra-prima definitiva da ficção científica sobre o planeta desértico Arrakis.',
      },
      {
        externalId: '185253',
        legacyExternalIds: ['181938'],
        domain: 'game',
        title: 'Dune: Spice Wars',
        releaseYear: 2023,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4a96.jpg',
        creatorOrAuthor: 'Shiro Games / Funcom',
        overview: 'Jogo de estratégia 4X em tempo real disputando o controle do tempero em Arrakis.',
      },
      {
        externalId: 'cv-4050-131752',
        legacyExternalIds: ['cv-dune-gn'],
        domain: 'comic',
        title: 'Duna: Graphic Novel Oficial',
        releaseYear: 2020,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/7680000-dune-gn-01.jpg',
        creatorOrAuthor: 'Brian Herbert & Raúl Allén',
        overview: 'Adaptação oficial em quadrinhos da magnum opus de Frank Herbert.',
      },
    ],
  },
  {
    id: 'tlou',
    name: 'The Last of Us',
    aliases: ['the last of us', 'tlou', 'joel e ellie', 'joel and ellie'],
    medias: [
      {
        externalId: '1009',
        domain: 'game',
        title: 'The Last of Us Part I',
        releaseYear: 2013,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg',
        creatorOrAuthor: 'Naughty Dog',
        overview: 'Narrativa emocionante pós-apocalíptica de sobrevivência entre Joel e Ellie.',
      },
      {
        externalId: '100088',
        domain: 'tv',
        title: 'The Last of Us',
        mediaType: 'tv',
        releaseYear: 2023,
        coverUrl: 'https://image.tmdb.org/t/p/w500/uKvVjK19dn5Alu7TAa92Ka7tdra.jpg',
        creatorOrAuthor: 'Craig Mazin & Neil Druckmann',
        overview: 'Adaptação aclamada da HBO vencedora de múltiplos prêmios.',
      },
      {
        externalId: 'cv-4050-59005',
        legacyExternalIds: ['cv-tlou-ad'],
        domain: 'comic',
        title: 'The Last of Us: American Dreams',
        releaseYear: 2013,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/3050123-the-last-of-us-american-dreams-01.jpg',
        creatorOrAuthor: 'Neil Druckmann & Faith Erin Hicks',
        overview: 'HQ prequela que narra o passado de Ellie antes de conhecer Joel.',
      },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    aliases: ['cyberpunk 2077', 'cyberpunk', 'edgerunners', 'night city'],
    medias: [
      {
        externalId: '1877',
        domain: 'game',
        title: 'Cyberpunk 2077',
        releaseYear: 2020,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coaih8.jpg',
        creatorOrAuthor: 'CD Projekt RED',
        overview: 'RPG de ação futurista imersivo ambientado na megalópole Night City.',
      },
      {
        externalId: '105248',
        domain: 'tv',
        title: 'Cyberpunk: Mercenários (Edgerunners)',
        mediaType: 'tv',
        releaseYear: 2022,
        coverUrl: 'https://image.tmdb.org/t/p/w500/7JkW1q5VfWqT53N2r6uV0v4wPq.jpg',
        creatorOrAuthor: 'Studio Trigger / CD Projekt',
        overview: 'Anime aclamado que expande o submundo frenético de Night City.',
      },
      {
        externalId: 'cv-4050-128827',
        legacyExternalIds: ['cv-cp-tt'],
        domain: 'comic',
        title: 'Cyberpunk 2077: Trauma Team',
        releaseYear: 2020,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/7550123-cyberpunk-tt-01.jpg',
        creatorOrAuthor: 'Cullen Bunn (Dark Horse)',
        overview: 'Quadrinho eletrizante focado nos paramédicos armados da corporação Trauma Team.',
      },
    ],
  },
  {
    id: 'lotr',
    name: 'O Senhor dos Anéis (Lord of the Rings)',
    aliases: ['senhor dos aneis', 'lord of the rings', 'lotr', 'tolkien', 'terra-media', 'middle-earth'],
    medias: [
      {
        externalId: '120',
        domain: 'movie',
        title: 'O Senhor dos Anéis: A Sociedade do Anel',
        mediaType: 'movie',
        releaseYear: 2001,
        coverUrl: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
        creatorOrAuthor: 'Peter Jackson',
        overview: 'Marco monumental da história do cinema adaptando a jornada do Um Anel.',
      },
      {
        externalId: 'R7KuDwAAQBAJ',
        legacyExternalIds: ['yl10DwAAQBAJ'],
        domain: 'book',
        title: 'O Senhor dos Anéis: A Sociedade do Anel',
        releaseYear: 1954,
        coverUrl: 'https://books.google.com/books/content?id=R7KuDwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        creatorOrAuthor: 'J.R.R. Tolkien',
        overview: 'O épico literário fundador da alta fantasia moderna de J.R.R. Tolkien.',
      },
      {
        externalId: '3025',
        legacyExternalIds: ['3182'],
        domain: 'game',
        title: 'Middle-earth: Shadow of Mordor',
        releaseYear: 2014,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20pd.jpg',
        creatorOrAuthor: 'Monolith Productions',
        overview: 'Ação em terceira pessoa com o célebre sistema Nemesis na Terra-média.',
      },
    ],
  },
  {
    id: 'arcane',
    name: 'Arcane & League of Legends',
    aliases: ['arcane', 'league of legends', 'runeterra', 'piltover', 'zaun', 'jinx'],
    medias: [
      {
        externalId: '115',
        domain: 'game',
        title: 'League of Legends',
        releaseYear: 2009,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coc99o.jpg',
        creatorOrAuthor: 'Riot Games',
        overview: 'O MOBA mais jogado do mundo, berço dos personagens e universo de Runeterra.',
      },
      {
        externalId: '94605',
        domain: 'tv',
        title: 'Arcane',
        mediaType: 'tv',
        releaseYear: 2021,
        coverUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397rpdvgqw.jpg',
        creatorOrAuthor: 'Riot Games & Fortiche Production',
        overview: 'Série de animação universalmente aclamada que retrata o conflito entre Piltover e Zaun.',
      },
    ],
  },
  {
    id: 'starwars',
    name: 'Star Wars',
    aliases: ['star wars', 'guerra nas estrelas', 'jedi', 'sith', 'skywalker', 'darth vader'],
    medias: [
      {
        externalId: '11',
        domain: 'movie',
        title: 'Star Wars: Episódio IV - Uma Nova Esperança',
        mediaType: 'movie',
        releaseYear: 1977,
        coverUrl: 'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
        creatorOrAuthor: 'George Lucas',
        overview: 'O filme original que deu início a uma das maiores franquias da história cultural.',
      },
      {
        externalId: '82856',
        domain: 'tv',
        title: 'The Mandalorian',
        mediaType: 'tv',
        releaseYear: 2019,
        coverUrl: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
        creatorOrAuthor: 'Jon Favreau',
        overview: 'As viagens de um caçador de recompensas solitário pelos confins da galáxia.',
      },
      {
        externalId: '74701',
        legacyExternalIds: ['103298'],
        domain: 'game',
        title: 'Star Wars Jedi: Fallen Order',
        releaseYear: 2019,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rbi.jpg',
        creatorOrAuthor: 'Respawn Entertainment',
        overview: 'Aventura de ação na pele do padawan Cal Kestis após a Ordem 66.',
      },
      {
        externalId: 'cv-4050-79888',
        legacyExternalIds: ['cv-sw-vader'],
        domain: 'comic',
        title: 'Star Wars: Darth Vader (Marvel)',
        releaseYear: 2015,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/4370123-darth-vader-01.jpg',
        creatorOrAuthor: 'Kieron Gillen & Salvador Larroca',
        overview: 'A aclamada série em quadrinhos da Marvel explorando as maquinações sombrias de Vader.',
      },
    ],
  },
  {
    id: 'fallout',
    name: 'Fallout',
    aliases: ['fallout', 'vault-tec', 'wasteland', 'pip-boy'],
    medias: [
      {
        externalId: '16',
        legacyExternalIds: ['15'],
        domain: 'game',
        title: 'Fallout: New Vegas',
        releaseYear: 2010,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u60.jpg',
        creatorOrAuthor: 'Obsidian Entertainment',
        overview: 'Clássico cult do RPG pós-apocalíptico com facções complexas no deserto de Mojave.',
      },
      {
        externalId: '106379',
        domain: 'tv',
        title: 'Fallout',
        mediaType: 'tv',
        releaseYear: 2024,
        coverUrl: 'https://image.tmdb.org/t/p/w500/ansFbW5oc96W6nvdzUuE3uP7mN8.jpg',
        creatorOrAuthor: 'Jonathan Nolan & Lisa Joy',
        overview: 'Adaptação do Prime Video que captura perfeitamente a sátira e os perigos dos refúgios nucleares.',
      },
    ],
  },
  {
    id: 'onepiece',
    name: 'One Piece',
    aliases: ['one piece', 'luffy', 'mugiwara', 'chapéu de palha', 'eiichiro oda'],
    medias: [
      {
        externalId: 'al-30013',
        legacyExternalIds: ['anilist-30013'],
        domain: 'comic',
        title: 'One Piece (Mangá)',
        releaseYear: 1997,
        coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30013-BeslEMqiPhlk.jpg',
        creatorOrAuthor: 'Eiichiro Oda',
        overview: 'A monumental saga de piratas que se tornou a série em quadrinhos mais vendida de todos os tempos.',
      },
      {
        externalId: '37854',
        domain: 'tv',
        title: 'One Piece (Anime)',
        mediaType: 'tv',
        releaseYear: 1999,
        coverUrl: 'https://image.tmdb.org/t/p/w500/cMD9Ygz11yjztv36nO3gDC9xQg0.jpg',
        creatorOrAuthor: 'Toei Animation',
        overview: 'A célebre jornada animada de Monkey D. Luffy em busca do maior tesouro do mundo.',
      },
      {
        externalId: '194837',
        legacyExternalIds: ['196871'],
        domain: 'game',
        title: 'One Piece Odyssey',
        releaseYear: 2023,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5x13.jpg',
        creatorOrAuthor: 'ILCA / Bandai Namco',
        overview: 'JRPG de turnos com história original supervisionada por Eiichiro Oda.',
      },
    ],
  },
  {
    id: 'castlevania',
    name: 'Castlevania',
    aliases: ['castlevania', 'belmont', 'alucard', 'dracula'],
    medias: [
      {
        externalId: '1128',
        legacyExternalIds: ['1195'],
        domain: 'game',
        title: 'Castlevania: Symphony of the Night',
        releaseYear: 1997,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co53m8.jpg',
        creatorOrAuthor: 'Konami',
        overview: 'A obra que definiu o gênero Metroidvania estrelada por Alucard.',
      },
      {
        externalId: '71024',
        domain: 'tv',
        title: 'Castlevania',
        mediaType: 'tv',
        releaseYear: 2017,
        coverUrl: 'https://image.tmdb.org/t/p/w500/7L4vK8mR5Yj830QpY2zZ0wZg6Xo.jpg',
        creatorOrAuthor: 'Warren Ellis & Powerhouse Animation',
        overview: 'Animação sombria da Netflix elogiada pelas batalhas e narrativa gótica visceral.',
      },
    ],
  },
  {
    id: 'batman',
    name: 'Batman',
    aliases: ['batman', 'cavaleiro das trevas', 'dark knight', 'gotham', 'bruce wayne'],
    medias: [
      {
        externalId: '414906',
        domain: 'movie',
        title: 'The Batman',
        mediaType: 'movie',
        releaseYear: 2022,
        coverUrl: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
        creatorOrAuthor: 'Matt Reeves',
        overview: 'Visão detetivesca e sombria do herói de Gotham enfrentando o Charada.',
      },
      {
        externalId: '501',
        legacyExternalIds: ['462'],
        domain: 'game',
        title: 'Batman: Arkham City',
        releaseYear: 2011,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1voh.jpg',
        creatorOrAuthor: 'Rocksteady Studios',
        overview: 'Um dos maiores jogos de super-heróis já produzidos, definindo combate e atmosfera.',
      },
      {
        externalId: 'cv-4050-3944',
        legacyExternalIds: ['cv-batman-dkr'],
        domain: 'comic',
        title: 'Batman: O Cavaleiro das Trevas',
        releaseYear: 1986,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/3/36279/2697011-batman_the_dark_knight_returns01.jpg',
        creatorOrAuthor: 'Frank Miller (DC Comics)',
        overview: 'A lendária graphic novel de Frank Miller que redefiniu o Batman na história dos quadrinhos.',
      },
    ],
  },
  {
    id: 'spiderman',
    name: 'Homem-Aranha (Spider-Man)',
    aliases: ['homem-aranha', 'spider-man', 'spiderman', 'peter parker', 'miles morales'],
    medias: [
      {
        externalId: '569094',
        domain: 'movie',
        title: 'Homem-Aranha: Através do Aranhaverso',
        mediaType: 'movie',
        releaseYear: 2023,
        coverUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
        creatorOrAuthor: 'Joaquim Dos Santos & Kemp Powers',
        overview: 'Obra-prima da animação que explora o multiverso com Miles Morales e Gwen Stacy.',
      },
      {
        externalId: '19565',
        legacyExternalIds: ['19560'],
        domain: 'game',
        title: "Marvel's Spider-Man",
        releaseYear: 2018,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r77.jpg',
        creatorOrAuthor: 'Insomniac Games',
        overview: 'Trajetória emocionante de Peter Parker em Nova York com jogabilidade de teia refinada.',
      },
      {
        externalId: 'cv-4050-43577',
        legacyExternalIds: ['cv-sp-kraven'],
        domain: 'comic',
        title: 'Homem-Aranha: A Última Caçada de Kraven',
        releaseYear: 1987,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/1234567-spider-kraven-01.jpg',
        creatorOrAuthor: 'J.M. DeMatteis & Mike Zeck (Marvel)',
        overview: 'Um dos arcos mais sombrios e psicológicos de toda a história do Aranha.',
      },
    ],
  },
  {
    id: 'sandman',
    name: 'The Sandman',
    aliases: ['sandman', 'morfeu', 'morpheus', 'sonho', 'neil gaiman', 'perpétuos'],
    medias: [
      {
        externalId: 'cv-4050-4241',
        legacyExternalIds: ['cv-sandman-saga'],
        domain: 'comic',
        title: 'The Sandman (Saga Completa)',
        releaseYear: 1989,
        coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/11142/111424135/7418293-sandman001.jpg',
        creatorOrAuthor: 'Neil Gaiman (DC Vertigo)',
        overview: 'A magnum opus dos quadrinhos literários misturando mitologia histórica e fantasia cósmica.',
      },
      {
        externalId: '90802',
        domain: 'tv',
        title: 'Sandman',
        mediaType: 'tv',
        releaseYear: 2022,
        coverUrl: 'https://image.tmdb.org/t/p/w500/q54qEgagGOYCq5Nm9tbg0tY4A1u.jpg',
        creatorOrAuthor: 'Neil Gaiman & Allan Heinberg',
        overview: 'Adaptação fiel e atmosférica das crônicas de Sonho e dos Perpétuos.',
      },
    ],
  },
];

/**
 * Normaliza uma string de texto removendo acentos, caracteres especiais e espaços extras.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Encontra qual franquia canônica corresponde a um título ou externalId.
 */
export function identifyFranchise(
  title: string,
  externalId: string,
  domain: TransmediaDomain
): CanonicalFranchise | null {
  const normTitle = normalizeText(title);

  for (const franchise of CANONICAL_FRANCHISES) {
    // 1. Checa correspondência por externalId e domínio (incluindo IDs legados)
    const hasMedia = franchise.medias.some(
      (m) =>
        (m.externalId === externalId || m.legacyExternalIds?.includes(externalId)) &&
        m.domain === domain
    );
    if (hasMedia) return franchise;

    // 2. Checa correspondência por nome ou alias
    const normFranchiseName = normalizeText(franchise.name);
    if (normTitle.includes(normFranchiseName)) return franchise;

    for (const alias of franchise.aliases) {
      const normAlias = normalizeText(alias);
      if (normAlias.length >= 3 && normTitle.includes(normAlias)) {
        return franchise;
      }
    }
  }

  return null;
}

/**
 * Extrai o radical ou núcleo do título de uma obra para busca de franquia,
 * removendo subtítulos, numerações de volume/temporada e pontuações acessórias.
 */
export function extractFranchiseCoreTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  // 1. Remove termos entre parênteses ou colchetes (ex: "(Saga O Bruxo - Vol. 1)")
  let core = rawTitle.replace(/\s*(\([^)]*\)|\[[^\]]*\])/g, ' ').trim();
  // 2. Remove subtítulo após ':', '-', '—', '/'
  core = core.split(/[:\-\—\/]/)[0].trim();
  // 3. Remove sufixos explícitos de volume, parte ou edição
  core = core.replace(/\b(vol(ume|\.)?|part(e|\.)?|season|temporada|ed(iç|it)ão)\b.*$/i, '').trim();
  // 4. Se ficou muito curto (< 3 caracteres), usa os primeiros termos do título original
  if (core.length < 3) {
    core = rawTitle.split(/[:\-\—]/)[0].trim();
  }
  return core || rawTitle.trim();
}

/**
 * Realiza buscas dinâmicas em tempo real nas APIs externas (TMDB, IGDB, Google Books, AniList/Comic Vine)
 * para encontrar adaptações e conexões transmídia cruzando domínios a partir de uma obra do usuário.
 */
export async function searchDynamicTransmediaCrossDomain(
  sourceItem: {
    id: number;
    title: string;
    externalId: string;
    domain: string;
    userRating: number | null;
    status: string;
  },
  existingKeys: Set<string>
): Promise<TransmediaRecommendationItem[]> {
  const coreTitle = extractFranchiseCoreTitle(sourceItem.title);
  if (!coreTitle || coreTitle.length < 3) return [];

  const sourceDomain = (sourceItem.domain as TransmediaDomain) || 'movie';
  const results: TransmediaRecommendationItem[] = [];
  const normCore = normalizeText(coreTitle);

  const fetchPromises: Promise<void>[] = [];

  // 1. Cinema e Séries (TMDB) — quando a mídia fonte não for filme/série
  if (['game', 'book', 'comic'].includes(sourceDomain)) {
    fetchPromises.push(
      (async () => {
        try {
          const [movieRes, tvRes] = await Promise.all([
            searchMedia(coreTitle, 'movie'),
            searchMedia(coreTitle, 'tv'),
          ]);
          const extractMediaList = (res: unknown): MediaDetails[] => {
            if (!res) return [];
            if (Array.isArray(res)) return res as MediaDetails[];
            if (typeof res === 'object' && res !== null && 'results' in res && Array.isArray((res as { results: unknown }).results)) {
              return (res as { results: MediaDetails[] }).results;
            }
            return [];
          };
          const mediaList: MediaDetails[] = [
            ...extractMediaList(movieRes),
            ...extractMediaList(tvRes),
          ];
          for (const m of mediaList.slice(0, 3)) {
            const domain: TransmediaDomain = m.mediaType === 'tv' ? 'tv' : 'movie';
            const key = `${domain}:${m.id}`;
            const normTitle = normalizeText(m.title);

            if (!existingKeys.has(key) && normTitle.includes(normCore)) {
              results.push({
                franchiseName: coreTitle,
                sourceItem: {
                  externalId: sourceItem.externalId,
                  domain: sourceDomain,
                  title: sourceItem.title,
                  userRating: sourceItem.userRating,
                  status: sourceItem.status,
                },
                targetItem: {
                  externalId: String(m.id),
                  domain,
                  title: m.title,
                  coverUrl: m.posterUrl || null,
                  releaseYear: m.releaseDate ? parseInt(m.releaseDate.split('-')[0], 10) || null : null,
                  overview: m.overview,
                  mediaType: m.mediaType,
                },
                reason: `Porque você tem "${sourceItem.title}" em ${domainToLabel(sourceDomain)}, o Akasha encontrou esta conexão dinâmica no universo transmídia em ${domainToLabel(domain)}.`,
                score: 91 + (sourceItem.userRating ? sourceItem.userRating * 2 : 0),
                isColdStart: false,
              });
              break;
            }
          }
        } catch {}
      })()
    );
  }

  // 2. Jogos (IGDB) — quando a mídia fonte não for game
  if (['movie', 'tv', 'book', 'comic'].includes(sourceDomain)) {
    fetchPromises.push(
      (async () => {
        try {
          const gameResults = await searchGames(coreTitle, 3);
          for (const g of gameResults) {
            const key = `game:${g.id}`;
            const normTitle = normalizeText(g.title);

            if (!existingKeys.has(key) && normTitle.includes(normCore)) {
              results.push({
                franchiseName: coreTitle,
                sourceItem: {
                  externalId: sourceItem.externalId,
                  domain: sourceDomain,
                  title: sourceItem.title,
                  userRating: sourceItem.userRating,
                  status: sourceItem.status,
                },
                targetItem: {
                  externalId: String(g.id),
                  domain: 'game',
                  title: g.title,
                  coverUrl: g.coverUrl || null,
                  releaseYear: g.releaseYear || null,
                  creatorOrAuthor: g.developer,
                  overview: g.summary,
                },
                reason: `Conexão fluída transmídia: expanda a experiência de "${sourceItem.title}" (${domainToLabel(sourceDomain)}) explorando este jogo oficial.`,
                score: 90 + (sourceItem.userRating ? sourceItem.userRating * 2 : 0),
                isColdStart: false,
              });
              break;
            }
          }
        } catch {}
      })()
    );
  }

  // 3. Livros (Google Books / Open Library) — quando a mídia fonte não for book
  if (['movie', 'tv', 'game', 'comic'].includes(sourceDomain)) {
    fetchPromises.push(
      (async () => {
        try {
          const bookResults = await searchBooks(coreTitle, 3);
          for (const b of bookResults) {
            const key = `book:${b.id}`;
            const normTitle = normalizeText(b.title);

            if (!existingKeys.has(key) && normTitle.includes(normCore)) {
              results.push({
                franchiseName: coreTitle,
                sourceItem: {
                  externalId: sourceItem.externalId,
                  domain: sourceDomain,
                  title: sourceItem.title,
                  userRating: sourceItem.userRating,
                  status: sourceItem.status,
                },
                targetItem: {
                  externalId: String(b.id),
                  domain: 'book',
                  title: b.title,
                  coverUrl: b.coverUrl || null,
                  releaseYear: b.releaseYear || null,
                  creatorOrAuthor: b.authors?.join(', '),
                  overview: b.description,
                },
                reason: `Aprofunde-se no universo literário correlato a "${sourceItem.title}" através desta obra em Livros.`,
                score: 89 + (sourceItem.userRating ? sourceItem.userRating * 2 : 0),
                isColdStart: false,
              });
              break;
            }
          }
        } catch {}
      })()
    );
  }

  // 4. Quadrinhos & Mangás (AniList / Comic Vine) — quando a mídia fonte não for comic
  if (['movie', 'tv', 'game', 'book'].includes(sourceDomain)) {
    fetchPromises.push(
      (async () => {
        try {
          const comicResults = await searchComics(coreTitle, 'all', 3);
          for (const c of comicResults) {
            const key = `comic:${c.id}`;
            const normTitle = normalizeText(c.title);

            if (!existingKeys.has(key) && normTitle.includes(normCore)) {
              results.push({
                franchiseName: coreTitle,
                sourceItem: {
                  externalId: sourceItem.externalId,
                  domain: sourceDomain,
                  title: sourceItem.title,
                  userRating: sourceItem.userRating,
                  status: sourceItem.status,
                },
                targetItem: {
                  externalId: String(c.id),
                  domain: 'comic',
                  title: c.title,
                  coverUrl: c.coverUrl || null,
                  releaseYear: c.releaseYear || null,
                  creatorOrAuthor: c.publisher || c.creators?.join(', '),
                  overview: c.description,
                },
                reason: `Explore a narrativa gráfica e sequencial deste universo em Quadrinhos/Mangá.`,
                score: 88 + (sourceItem.userRating ? sourceItem.userRating * 2 : 0),
                isColdStart: false,
              });
              break;
            }
          }
        } catch {}
      })()
    );
  }

  await Promise.allSettled(fetchPromises);
  return results;
}

/**
 * Retorna as recomendações transmídia do usuário cruzando as mídias da sua biblioteca.
 */
export async function getUserTransmediaRecommendations(
  userId: string,
  limit: number = 10
): Promise<TransmediaRecommendationItem[]> {
  // 1. Busca todos os itens da wishlist do usuário
  const userItems = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const existingKeys = new Set<string>();
  for (const item of userItems) {
    existingKeys.add(`${item.domain}:${item.externalId}`);
    for (const franchise of CANONICAL_FRANCHISES) {
      for (const m of franchise.medias) {
        if (
          m.domain === item.domain &&
          (m.externalId === item.externalId || m.legacyExternalIds?.includes(item.externalId))
        ) {
          existingKeys.add(`${m.domain}:${m.externalId}`);
          if (m.legacyExternalIds) {
            for (const leg of m.legacyExternalIds) {
              existingKeys.add(`${m.domain}:${leg}`);
            }
          }
        }
      }
    }
  }
  const recommendations: TransmediaRecommendationItem[] = [];

  // Mapeia franquias canônicas em que o usuário possui obras
  const franchiseToUserItems = new Map<
    string,
    Array<{ item: typeof userItems[0]; franchise: CanonicalFranchise }>
  >();

  const unmappedUserItems: Array<typeof userItems[0]> = [];

  for (const item of userItems) {
    const domain = (item.domain as TransmediaDomain) || 'movie';
    const franchise = identifyFranchise(item.title, item.externalId, domain);
    if (franchise) {
      const list = franchiseToUserItems.get(franchise.id) || [];
      list.push({ item, franchise });
      franchiseToUserItems.set(franchise.id, list);
    } else {
      unmappedUserItems.push(item);
    }
  }

  // 2. Motor Principal Fluído & Dinâmico (Regra 7 - Proibição de Hardcoding):
  // Prioriza obras do usuário por nota e conclusão e busca em tempo real nas APIs (TMDB, IGDB, Books, Comics)
  const prioritizedUserItems = [...userItems].sort((a, b) => {
    const ratingA = a.userRating ?? 3;
    const ratingB = b.userRating ?? 3;
    if (ratingB !== ratingA) return ratingB - ratingA;
    const isCompA = a.status === 'completed' ? 1 : 0;
    const isCompB = b.status === 'completed' ? 1 : 0;
    return isCompB - isCompA;
  });

  for (const item of prioritizedUserItems.slice(0, 6)) {
    if (recommendations.length >= limit) break;
    try {
      const dynamicRecs = await searchDynamicTransmediaCrossDomain(item, existingKeys);
      for (const dRec of dynamicRecs) {
        const dKey = `${dRec.targetItem.domain}:${dRec.targetItem.externalId}`;
        const alreadyAdded = recommendations.some(
          (r) => `${r.targetItem.domain}:${r.targetItem.externalId}` === dKey
        );
        if (!alreadyAdded) {
          recommendations.push(dRec);
          existingKeys.add(dKey);
          if (recommendations.length >= limit) break;
        }
      }
    } catch {}
  }

  // 3. Fallback de Contingência de Rede/Cota (Regra 7):
  // Se as APIs externas não retornarem conexões suficientes para preencher o limite,
  // utiliza as pontes canônicas mapeadas exclusivamente como rede de segurança
  if (recommendations.length < limit) {
    for (const [, entries] of franchiseToUserItems) {
      if (recommendations.length >= limit) break;
      const bestUserEntry = [...entries].sort((a, b) => {
        const ratingA = a.item.userRating ?? 3;
        const ratingB = b.item.userRating ?? 3;
        return ratingB - ratingA;
      })[0];

      const sourceItem = bestUserEntry.item;
      const franchise = bestUserEntry.franchise;
      const sourceDomain = (sourceItem.domain as TransmediaDomain) || 'movie';

      for (const media of franchise.medias) {
        if (recommendations.length >= limit) break;
        const targetKey = `${media.domain}:${media.externalId}`;
        const isSameMedia =
          media.domain === sourceDomain &&
          (media.externalId === sourceItem.externalId ||
            Boolean(media.legacyExternalIds?.includes(sourceItem.externalId)));

        if (existingKeys.has(targetKey) || isSameMedia) {
          continue;
        }

        let score = 92;
        const rating = sourceItem.userRating;
        if (rating && rating >= 4) {
          score += rating * 2;
        }

        let reason = `Porque você consumiu e apreciou "${sourceItem.title}" em ${domainToLabel(sourceDomain)}, explore esta obra no universo de ${franchise.name}.`;
        if (rating && rating >= 4) {
          reason = `Porque você avaliou "${sourceItem.title}" com ${rating}★ em ${domainToLabel(sourceDomain)}, descubra a expansão oficial desta franquia em ${domainToLabel(media.domain)}.`;
        } else if (sourceItem.status === 'completed') {
          reason = `Como você concluiu "${sourceItem.title}" em ${domainToLabel(sourceDomain)}, conecte-se com este clássico em ${domainToLabel(media.domain)}.`;
        }

        recommendations.push({
          franchiseName: franchise.name,
          sourceItem: {
            externalId: sourceItem.externalId,
            domain: sourceDomain,
            title: sourceItem.title,
            userRating: sourceItem.userRating,
            status: sourceItem.status,
          },
          targetItem: {
            externalId: media.externalId,
            domain: media.domain,
            title: media.title,
            coverUrl: media.coverUrl,
            releaseYear: media.releaseYear,
            creatorOrAuthor: media.creatorOrAuthor,
            overview: media.overview,
            mediaType: media.mediaType,
            extraMeta: media.extraMeta,
          },
          reason,
          score: Math.min(99, score),
          isColdStart: false,
        });
        existingKeys.add(targetKey);
      }
    }
  }

  // 4. Se não houver recomendações suficientes (Cold Start com biblioteca vazia), complementa com destaques canônicos
  if (recommendations.length < limit) {
    const coldStartPool = CANONICAL_FRANCHISES.flatMap((franchise) => {
      if (franchise.medias.length >= 2) {
        const first = franchise.medias[0];
        const second = franchise.medias[1];

        if (!existingKeys.has(`${second.domain}:${second.externalId}`)) {
          return [
            {
              franchiseName: franchise.name,
              sourceItem: {
                externalId: first.externalId,
                domain: first.domain,
                title: first.title,
              },
              targetItem: {
                externalId: second.externalId,
                domain: second.domain,
                title: second.title,
                coverUrl: second.coverUrl,
                releaseYear: second.releaseYear,
                creatorOrAuthor: second.creatorOrAuthor,
                overview: second.overview,
                mediaType: second.mediaType,
                extraMeta: second.extraMeta,
              },
              reason: `Conexão Transmídia Canônica: Se você se interessa por ${domainToLabel(first.domain)}, experimente a expansão deste clássico em ${domainToLabel(second.domain)}.`,
              score: 88,
              isColdStart: true,
            },
          ];
        }
      }
      return [];
    });

    for (const item of coldStartPool) {
      const targetKey = `${item.targetItem.domain}:${item.targetItem.externalId}`;
      const alreadyAdded = recommendations.some(
        (r) => `${r.targetItem.domain}:${r.targetItem.externalId}` === targetKey
      );
      if (!alreadyAdded && !existingKeys.has(targetKey)) {
        recommendations.push(item);
        if (recommendations.length >= limit) break;
      }
    }
  }

  // Ordena por maior afinidade / score
  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Converte o enum de domínio para texto amigável em português.
 */
function domainToLabel(domain: TransmediaDomain): string {
  switch (domain) {
    case 'movie':
      return 'Cinema';
    case 'tv':
      return 'Séries';
    case 'game':
      return 'Jogos';
    case 'book':
      return 'Livros';
    case 'comic':
      return 'Quadrinhos';
  }
}

/**
 * Calcula as métricas consolidadas do Grande Acervo do usuário.
 */
export async function getUserArchiveStats(userId: string): Promise<ArchiveStatsResponse> {
  const items = await prisma.wishlist.findMany({
    where: { userId },
  });

  const totalItems = items.length;

  // 1. Quebra por domínio
  const domains: TransmediaDomain[] = ['movie', 'tv', 'game', 'book', 'comic'];
  const domainBreakdown: Record<
    TransmediaDomain,
    { count: number; percentage: number; averageRating: number | null }
  > = {
    movie: { count: 0, percentage: 0, averageRating: null },
    tv: { count: 0, percentage: 0, averageRating: null },
    game: { count: 0, percentage: 0, averageRating: null },
    book: { count: 0, percentage: 0, averageRating: null },
    comic: { count: 0, percentage: 0, averageRating: null },
  };

  const domainRatingSums: Record<TransmediaDomain, { sum: number; ratedCount: number }> = {
    movie: { sum: 0, ratedCount: 0 },
    tv: { sum: 0, ratedCount: 0 },
    game: { sum: 0, ratedCount: 0 },
    book: { sum: 0, ratedCount: 0 },
    comic: { sum: 0, ratedCount: 0 },
  };

  // 2. Quebra por status
  const statusCounts = {
    plan_to_watch: 0,
    watching: 0,
    completed: 0,
    dropped: 0,
  };

  // 3. Notas
  let totalRatingSum = 0;
  let totalRatedCount = 0;
  const ratingDistribution: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };

  // 4. Métricas de consumo
  let estimatedScreenHours = 0;
  let estimatedGameHours = 0;
  let estimatedPagesRead = 0;
  let totalComicVolumes = 0;

  // Franquias identificadas no acervo do usuário
  const userFranchisesMap = new Map<string, { name: string; domains: Set<TransmediaDomain>; count: number }>();

  for (const item of items) {
    const rawDomain = (item.domain as TransmediaDomain) || 'movie';
    const domain: TransmediaDomain = domains.includes(rawDomain) ? rawDomain : 'movie';

    domainBreakdown[domain].count += 1;

    // Status
    const statusKey = item.status as keyof typeof statusCounts;
    if (statusCounts[statusKey] !== undefined) {
      statusCounts[statusKey] += 1;
    }

    // Avaliações
    if (item.userRating && item.userRating >= 1 && item.userRating <= 5) {
      totalRatingSum += item.userRating;
      totalRatedCount += 1;
      ratingDistribution[String(item.userRating)] += 1;

      domainRatingSums[domain].sum += item.userRating;
      domainRatingSums[domain].ratedCount += 1;
    }

    // Estimativas de consumo
    if (domain === 'movie') {
      if (item.status === 'completed') estimatedScreenHours += 2.0;
      else if (item.status === 'watching') estimatedScreenHours += 1.0;
    } else if (domain === 'tv') {
      if (item.status === 'completed') estimatedScreenHours += 10.0;
      else if (item.status === 'watching') estimatedScreenHours += 4.0;
    } else if (domain === 'game') {
      if (item.status === 'completed') estimatedGameHours += 35.0;
      else if (item.status === 'watching') estimatedGameHours += 15.0;
    } else if (domain === 'book') {
      const pages = typeof item.extraMeta === 'object' && item.extraMeta !== null && 'pageCount' in item.extraMeta
        ? Number((item.extraMeta as any).pageCount) || 300
        : 300;
      if (item.status === 'completed') estimatedPagesRead += pages;
      else if (item.status === 'watching') estimatedPagesRead += Math.round(pages * 0.4);
    } else if (domain === 'comic') {
      totalComicVolumes += 1;
    }

    // Identificação de Franquias
    const franchise = identifyFranchise(item.title, item.externalId, domain);
    if (franchise) {
      const existing = userFranchisesMap.get(franchise.id) || {
        name: franchise.name,
        domains: new Set<TransmediaDomain>(),
        count: 0,
      };
      existing.domains.add(domain);
      existing.count += 1;
      userFranchisesMap.set(franchise.id, existing);
    }
  }

  // Preenche percentuais e médias por domínio
  for (const d of domains) {
    domainBreakdown[d].percentage = totalItems > 0 ? Math.round((domainBreakdown[d].count / totalItems) * 100) : 0;
    const { sum, ratedCount } = domainRatingSums[d];
    domainBreakdown[d].averageRating = ratedCount > 0 ? Number((sum / ratedCount).toFixed(1)) : null;
  }

  // Status breakdown com percentuais
  const statusBreakdown = {
    plan_to_watch: {
      count: statusCounts.plan_to_watch,
      percentage: totalItems > 0 ? Math.round((statusCounts.plan_to_watch / totalItems) * 100) : 0,
    },
    watching: {
      count: statusCounts.watching,
      percentage: totalItems > 0 ? Math.round((statusCounts.watching / totalItems) * 100) : 0,
    },
    completed: {
      count: statusCounts.completed,
      percentage: totalItems > 0 ? Math.round((statusCounts.completed / totalItems) * 100) : 0,
    },
    dropped: {
      count: statusCounts.dropped,
      percentage: totalItems > 0 ? Math.round((statusCounts.dropped / totalItems) * 100) : 0,
    },
  };

  // Franquias Top
  const topFranchises = Array.from(userFranchisesMap.values())
    .map((f) => ({
      name: f.name,
      count: f.count,
      domains: Array.from(f.domains),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Cálculo do Índice de Amplitude Cultural Akasha (Diversity Index)
  // Baseia-se no número de domínios ativos e no balanceamento entre eles
  const activeDomainsCount = domains.filter((d) => domainBreakdown[d].count > 0).length;
  let diversityScore = 0;

  if (totalItems > 0) {
    // Equilíbrio: quanto mais domínios com representação próxima de 20%, maior o score
    const targetShare = 1 / domains.length; // 0.20
    let variance = 0;
    for (const d of domains) {
      const share = domainBreakdown[d].count / totalItems;
      variance += Math.pow(share - targetShare, 2);
    }
    const maxVariance = Math.pow(1 - targetShare, 2) + (domains.length - 1) * Math.pow(0 - targetShare, 2);
    const balance = Math.max(0, 1 - variance / maxVariance);

    // Score composto: peso dos domínios ativos + equilíbrio
    diversityScore = Math.round((activeDomainsCount / domains.length) * 50 + balance * 50);
  }

  // Título e descrição do arquétipo
  let archetypeTitle = 'Neófito do Acervo';
  let archetypeDescription = 'Dê os primeiros passos adicionando suas primeiras obras no Akasha.';

  if (totalItems > 0) {
    if (diversityScore >= 80) {
      archetypeTitle = 'Polímata Transmídia';
      archetypeDescription = 'Você transcende os limites de uma única mídia e navega com maestria absoluta entre cinema, games, livros e quadrinhos.';
    } else if (domainBreakdown.movie.percentage + domainBreakdown.tv.percentage >= 65) {
      archetypeTitle = 'Cinéfilo Devoto';
      archetypeDescription = 'As telas e narrativas audiovisuais são seu templo sagrado de imersão e emoção.';
    } else if (domainBreakdown.game.percentage >= 50) {
      archetypeTitle = 'Arquiteto de Mundos Virtuais';
      archetypeDescription = 'O controle é sua extensão natural: você busca experiências interativas e profundas no mundo dos games.';
    } else if (domainBreakdown.book.percentage + domainBreakdown.comic.percentage >= 50) {
      archetypeTitle = 'Guardião da Arte Sequencial e Literária';
      archetypeDescription = 'Seu refúgio primordial reside nas páginas, na tipografia e nas ilustrações fascinantes.';
    } else {
      archetypeTitle = 'Explorador Multiverso';
      archetypeDescription = 'Você mantém um equilíbrio dinâmico e expande constantemente seu repertório cultural.';
    }
  }

  return {
    totalItems,
    domainBreakdown,
    statusBreakdown,
    ratingStats: {
      average: totalRatedCount > 0 ? Number((totalRatingSum / totalRatedCount).toFixed(1)) : 0,
      ratedCount: totalRatedCount,
      distribution: ratingDistribution,
    },
    consumptionMetrics: {
      estimatedScreenHours: Math.round(estimatedScreenHours),
      estimatedGameHours: Math.round(estimatedGameHours),
      estimatedPagesRead: Math.round(estimatedPagesRead),
      totalComicVolumes,
    },
    franchiseStats: {
      totalFranchises: userFranchisesMap.size,
      topFranchises,
    },
    diversityIndex: {
      score: diversityScore,
      archetypeTitle,
      archetypeDescription,
    },
  };
}
