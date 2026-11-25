export const fmt = (s: number) => {
  const t = Math.max(0, s), m = Math.floor(t / 60), x = t - m * 60
  return String(m).padStart(2, '0') + ':' + x.toFixed(3).padStart(6, '0')
}
