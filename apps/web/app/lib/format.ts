export function formatCount(n: number): string {
  return n.toString().padStart(3, "0");
}

export function timestamp(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(
    d.getUTCDate(),
  )}/${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}
