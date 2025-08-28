export interface Prize {
  id: string
  label: string
  prob: number       // 0‒1
  color: string
  cantidad: number   // número de unidades disponibles
}

// Returns index of prize
export function weightedRandom(prizes: Prize[]): number {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < prizes.length; i++) {
    acc += prizes[i].prob
    if (r <= acc) return i
  }
  // fallback – shouldn’t happen if probs sum to 1
  return prizes.length - 1
}