// Cálculo do resultado do quiz de Eneagrama + Radar Emocional.
// Recebe o mapa de pontuação (categorias tipo1..tipo9 e vicio1..vicio9).

export interface EnneagramOutcome {
  profile: string[] // 1 a 3 chaves tipoN (o mais pontuado + próximos)
  radar: string[] // 1 a 2 chaves vicioN (vícios ativos)
}

export function computeEnneagram(
  scores: Record<string, number>
): EnneagramOutcome {
  // ── Perfil (Bloco 1) ──
  // Regra: diferença ≥2 entre 1º e 2º → crava 1 tipo.
  // Diferença de 1 ou empate → mostra os próximos (dentro de 1 ponto), até 3.
  const tipos = Array.from({ length: 9 }, (_, i) => `tipo${i + 1}`)
    .map((k) => ({ k, v: scores[k] ?? 0 }))
    .sort((a, b) => b.v - a.v)
  const topT = tipos[0]?.v ?? 0
  const profile =
    topT <= 0
      ? []
      : tipos
          .filter((t) => t.v > 0 && t.v >= topT - 1)
          .slice(0, 3)
          .map((t) => t.k)

  // ── Radar (Bloco 2) ──
  // O vício mais pontuado + o segundo se estiver dentro de 1 ponto. Máx 2.
  const vicios = Array.from({ length: 9 }, (_, i) => `vicio${i + 1}`)
    .map((k) => ({ k, v: scores[k] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
  const radar: string[] = []
  if (vicios.length > 0) {
    radar.push(vicios[0].k)
    if (vicios[1] && vicios[1].v >= vicios[0].v - 1) radar.push(vicios[1].k)
  }

  return { profile, radar }
}
