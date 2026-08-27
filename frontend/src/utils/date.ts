/**
 * Extrai o ano de lançamento de uma string de data no formato ISO (ex: "2024-05-15" ou "2024")
 * de forma segura e independente de fuso horário (timezone).
 *
 * NOTA DE ARQUITETURA:
 * O uso de `new Date("YYYY-MM-DD").getFullYear()` no JS causa um bug onde em fusos horários
 * a oeste do UTC (como GMT-3 no Brasil), a data a 00:00:00 UTC converte para 21:00:00 do dia anterior,
 * resultando em anos incorretos (ex: 1999-01-01 virava 1998).
 *
 * Esta função utiliza extração regex dos primeiros 4 dígitos, evitando conversão de fuso horário.
 */
export function getReleaseYear(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})/);
  return match ? match[1] : null;
}
