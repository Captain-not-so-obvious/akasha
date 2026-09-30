export interface BookDetails {
  id: string; // Google Books Volume ID ou Open Library Work ID
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  releaseYear: number | null;
  description?: string;
  pageCount?: number;
  categories: string[];
  averageRating?: number;
  ratingsCount?: number;
  coverUrl: string | null;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  previewLink?: string;
}

interface GoogleBooksIndustryIdentifier {
  type: string;
  identifier: string;
}

interface GoogleBooksImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  imageLinks?: GoogleBooksImageLinks;
  language?: string;
  previewLink?: string;
}

interface GoogleBooksVolumeItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems?: number;
  items?: GoogleBooksVolumeItem[];
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  number_of_pages_median?: number;
  language?: string[];
}

interface OpenLibrarySearchResponse {
  numFound?: number;
  docs?: OpenLibraryDoc[];
}

interface OpenLibraryWorkResponse {
  key?: string;
  title?: string;
  description?: string | { type?: string; value?: string };
  covers?: number[];
  subjects?: string[];
}

const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';

/**
 * Retorna a chave de API do Google Books se configurada nas variáveis de ambiente.
 */
function getApiKeyParam(): string {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  return apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
}

/**
 * Sanitiza strings com tags HTML ou entidades codificadas retornadas pela API.
 */
function sanitizeHtmlDescription(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Garante que a URL da capa utilize HTTPS e selecione a melhor resolução disponível.
 */
function extractSecureCoverUrl(imageLinks?: GoogleBooksImageLinks): string | null {
  if (!imageLinks) return null;
  const rawUrl =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail;

  if (!rawUrl) return null;

  // Substitui http:// por https:// e ajusta para parâmetros limpos
  let secure = rawUrl.replace(/^http:\/\//i, 'https://');
  // Se contiver edge=curl, removemos para evitar efeito de página dobrada em resoluções altas se aplicável
  secure = secure.replace('&edge=curl', '');
  return secure;
}

/**
 * Normaliza um volume retornado da Google Books API para o formato estrito BookDetails.
 */
export function normalizeGoogleBook(item: GoogleBooksVolumeItem): BookDetails {
  const info = item.volumeInfo || {};

  let releaseYear: number | null = null;
  if (info.publishedDate) {
    const yearCandidate = parseInt(info.publishedDate.substring(0, 4), 10);
    if (!isNaN(yearCandidate) && yearCandidate > 0) {
      releaseYear = yearCandidate;
    }
  }

  let isbn10: string | undefined;
  let isbn13: string | undefined;
  if (Array.isArray(info.industryIdentifiers)) {
    for (const ident of info.industryIdentifiers) {
      if (ident.type === 'ISBN_10') isbn10 = ident.identifier;
      if (ident.type === 'ISBN_13') isbn13 = ident.identifier;
    }
  }

  return {
    id: item.id,
    title: info.title || 'Sem título',
    subtitle: info.subtitle,
    authors: Array.isArray(info.authors) && info.authors.length > 0 ? info.authors : ['Autor Desconhecido'],
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    releaseYear,
    description: sanitizeHtmlDescription(info.description),
    pageCount: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : undefined,
    categories: Array.isArray(info.categories) ? info.categories : [],
    averageRating: info.averageRating,
    ratingsCount: info.ratingsCount,
    coverUrl: extractSecureCoverUrl(info.imageLinks),
    isbn10,
    isbn13,
    language: info.language,
    previewLink: info.previewLink,
  };
}

/**
 * Normaliza um documento da Open Library API para BookDetails.
 */
export function normalizeOpenLibraryDoc(doc: OpenLibraryDoc): BookDetails {
  const cleanId = doc.key.replace(/^\/works\//, '');
  const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;

  return {
    id: cleanId,
    title: doc.title || 'Sem título',
    subtitle: doc.subtitle,
    authors: Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name : ['Autor Desconhecido'],
    publisher: Array.isArray(doc.publisher) && doc.publisher.length > 0 ? doc.publisher[0] : undefined,
    releaseYear: doc.first_publish_year ?? null,
    pageCount: doc.number_of_pages_median,
    categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [],
    coverUrl,
    isbn10: doc.isbn?.find((i) => i.length === 10),
    isbn13: doc.isbn?.find((i) => i.length === 13),
    language: doc.language?.[0],
  };
}

/**
 * Realiza busca na Open Library API (Provedor Fallback aberto e sem chave).
 */
export async function searchOpenLibrary(query: string, limit = 12): Promise<BookDetails[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const maxResults = Math.min(Math.max(limit, 1), 40);
  try {
    const fields = 'key,title,subtitle,author_name,publisher,first_publish_year,cover_i,isbn,subject,number_of_pages_median,language';
    const isIsbnOnly = /^[0-9-]{10,17}$/.test(trimmed) || /^isbn:/i.test(trimmed);
    const cleanIsbn = trimmed.replace(/^isbn:/i, '').replace(/-/g, '');

    const url = isIsbnOnly
      ? `${OPEN_LIBRARY_BASE_URL}/search.json?isbn=${encodeURIComponent(cleanIsbn)}&limit=${maxResults}&fields=${fields}`
      : `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(trimmed)}&limit=${maxResults}&fields=${fields}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as OpenLibrarySearchResponse;
    if (Array.isArray(data.docs) && data.docs.length > 0) {
      return data.docs.map(normalizeOpenLibraryDoc);
    }
    return [];
  } catch (err) {
    console.error('[Books Service] Erro no fallback Open Library:', err);
    return [];
  }
}

/**
 * Busca detalhes de uma obra na Open Library API.
 */
export async function fetchOpenLibraryBookDetails(workId: string): Promise<BookDetails | null> {
  const cleanId = workId.replace(/^\/works\//, '').trim();
  if (!cleanId) return null;

  try {
    const workUrl = `${OPEN_LIBRARY_BASE_URL}/works/${encodeURIComponent(cleanId)}.json`;
    const res = await fetch(workUrl);
    if (!res.ok) return null;

    const data = (await res.json()) as OpenLibraryWorkResponse;
    if (!data || !data.title) return null;

    let description: string | undefined;
    if (typeof data.description === 'string') {
      description = data.description;
    } else if (data.description && typeof data.description === 'object' && data.description.value) {
      description = data.description.value;
    }

    // Busca detalhes adicionais via search para compor autores, páginas e ISBN
    const searchUrl = `${OPEN_LIBRARY_BASE_URL}/search.json?q=key:/works/${encodeURIComponent(cleanId)}&limit=1&fields=key,title,author_name,first_publish_year,cover_i,isbn,subject,publisher,number_of_pages_median,language`;
    let authors = ['Autor Desconhecido'];
    let coverUrl: string | null = null;
    let releaseYear: number | null = null;
    let isbn10: string | undefined;
    let isbn13: string | undefined;
    let publisher: string | undefined;
    let pageCount: number | undefined;

    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as OpenLibrarySearchResponse;
      const doc = searchData.docs?.[0];
      if (doc) {
        if (Array.isArray(doc.author_name) && doc.author_name.length > 0) authors = doc.author_name;
        if (doc.cover_i) coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        if (doc.first_publish_year) releaseYear = doc.first_publish_year;
        if (doc.publisher?.[0]) publisher = doc.publisher[0];
        if (doc.number_of_pages_median) pageCount = doc.number_of_pages_median;
        isbn10 = doc.isbn?.find((i) => i.length === 10);
        isbn13 = doc.isbn?.find((i) => i.length === 13);
      }
    }

    if (!coverUrl && Array.isArray(data.covers) && data.covers.length > 0 && data.covers[0] > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }

    return {
      id: cleanId,
      title: data.title,
      authors,
      publisher,
      releaseYear,
      description: sanitizeHtmlDescription(description),
      pageCount,
      categories: Array.isArray(data.subjects) ? data.subjects.slice(0, 5) : [],
      coverUrl,
      isbn10,
      isbn13,
    };
  } catch (err) {
    console.error(`[Books Service] Erro ao buscar detalhes Open Library para ${cleanId}:`, err);
    return null;
  }
}

/**
 * Realiza busca textual e por ISBN: tenta o Google Books e faz fallback transparente para a Open Library API.
 */
export async function searchBooks(query: string, limit = 12): Promise<BookDetails[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const maxResults = Math.min(Math.max(limit, 1), 40);
  const apiKeyParam = getApiKeyParam();

  // Detecta se é busca por ISBN puro (apenas dígitos e hífens)
  const isIsbnOnly = /^[0-9-]{10,17}$/.test(trimmed) || /^isbn:/i.test(trimmed);
  const formattedQuery = isIsbnOnly
    ? /^isbn:/i.test(trimmed)
      ? trimmed
      : `isbn:${trimmed.replace(/-/g, '')}`
    : trimmed;

  try {
    // 1. Tenta a busca no Google Books com langRestrict=pt para priorizar edições em português
    const primaryUrl = isIsbnOnly
      ? `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(formattedQuery)}&maxResults=${maxResults}${apiKeyParam}`
      : `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(formattedQuery)}&langRestrict=pt&maxResults=${maxResults}${apiKeyParam}`;

    const res = await fetch(primaryUrl);
    if (res.ok) {
      const data = (await res.json()) as GoogleBooksResponse;
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map(normalizeGoogleBook);
      }

      // Se não retornou nada com langRestrict=pt e não era ISBN, tenta sem restrição de idioma
      if (!isIsbnOnly) {
        const fallbackUrl = `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(formattedQuery)}&maxResults=${maxResults}${apiKeyParam}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as GoogleBooksResponse;
          if (Array.isArray(fallbackData.items) && fallbackData.items.length > 0) {
            return fallbackData.items.map(normalizeGoogleBook);
          }
        }
      }
    } else {
      console.warn(
        `[Books Service] Google Books retornou HTTP ${res.status} (cota excedida ou ausência de GOOGLE_BOOKS_API_KEY). Acionando fallback Open Library...`
      );
    }
  } catch (error) {
    console.warn('[Books Service] Falha na requisição ao Google Books. Acionando fallback Open Library:', error);
  }

  // 2. Fallback resiliente: Open Library API (sempre aberto, gratuito e sem exigência de API Key)
  return searchOpenLibrary(query, limit);
}

/**
 * Busca os detalhes completos de um livro pelo ID (Google Books ou Open Library).
 */
export async function fetchBookDetails(volumeId: string): Promise<BookDetails | null> {
  const cleanId = volumeId.trim();
  if (!cleanId) return null;

  // Se o ID for característico do Open Library (começa com OL ou /works/)
  if (cleanId.startsWith('OL') || cleanId.startsWith('/works/')) {
    return fetchOpenLibraryBookDetails(cleanId);
  }

  const apiKeyParam = process.env.GOOGLE_BOOKS_API_KEY
    ? `?key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`
    : '';

  try {
    const url = `${GOOGLE_BOOKS_BASE_URL}/${encodeURIComponent(cleanId)}${apiKeyParam}`;
    const res = await fetch(url);
    if (res.ok) {
      const item = (await res.json()) as GoogleBooksVolumeItem;
      if (item && item.id) {
        return normalizeGoogleBook(item);
      }
    } else if (res.status === 404) {
      return null;
    } else {
      console.warn(`[Books Service] Google Books retornou HTTP ${res.status} para livro ${cleanId}. Tentando Open Library...`);
    }
  } catch (error) {
    console.warn(`[Books Service] Erro ao buscar livro ${cleanId} no Google Books:`, error);
  }

  // Fallback se não encontrado no Google Books
  return fetchOpenLibraryBookDetails(cleanId);
}

/**
 * Busca livros populares / clássicos consagrados em língua portuguesa para estante inicial e destaques.
 */
export async function fetchPopularBooks(limit = 12): Promise<BookDetails[]> {
  const maxResults = Math.min(Math.max(limit, 1), 40);
  const apiKeyParam = getApiKeyParam();

  try {
    const query = 'subject:Fiction OR subject:Literature OR "Machado de Assis" OR "Clarice Lispector"';
    const url = `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(query)}&langRestrict=pt&orderBy=relevance&maxResults=${maxResults}${apiKeyParam}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as GoogleBooksResponse;
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map(normalizeGoogleBook);
      }
    }
  } catch (error) {
    console.warn('[Books Service] Falha ao buscar populares no Google Books. Acionando fallback Open Library:', error);
  }

  // Fallback Open Library para clássicos populares
  return searchOpenLibrary('Machado de Assis OR Tolkien OR Clarice Lispector OR George Orwell', limit);
}

/**
 * Busca livros de um determinado autor.
 */
export async function searchBooksByAuthor(author: string, limit = 8): Promise<BookDetails[]> {
  const cleanAuthor = author.trim();
  if (!cleanAuthor) return [];

  const maxResults = Math.min(Math.max(limit, 1), 40);
  const apiKeyParam = getApiKeyParam();

  try {
    const query = `inauthor:"${cleanAuthor}"`;
    const url = `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(query)}&langRestrict=pt&orderBy=relevance&maxResults=${maxResults}${apiKeyParam}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as GoogleBooksResponse;
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map(normalizeGoogleBook);
      }
    }
  } catch {
    // Silencia e recorre ao fallback Open Library
  }

  // Fallback Open Library por autor
  return searchOpenLibrary(`author:"${cleanAuthor}"`, limit);
}

/**
 * Busca livros por assunto ou gênero literário.
 */
export async function searchBooksBySubject(subject: string, limit = 8): Promise<BookDetails[]> {
  const cleanSubject = subject.trim();
  if (!cleanSubject) return [];

  const maxResults = Math.min(Math.max(limit, 1), 40);
  const apiKeyParam = getApiKeyParam();

  try {
    const query = `subject:"${cleanSubject}"`;
    const url = `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(query)}&langRestrict=pt&orderBy=relevance&maxResults=${maxResults}${apiKeyParam}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as GoogleBooksResponse;
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map(normalizeGoogleBook);
      }
    }
  } catch {
    // Silencia e recorre ao fallback Open Library
  }

  // Fallback Open Library por assunto
  return searchOpenLibrary(`subject:"${cleanSubject}"`, limit);
}
