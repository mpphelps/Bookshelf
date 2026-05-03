export function formatCount(n: number): string {
  return n.toString().padStart(3, "0");
}

export function timestamp(date: Date = new Date()): string {
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(
    date.getUTCDate(),
  )}/${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
}
