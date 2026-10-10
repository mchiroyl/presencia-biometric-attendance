export function schoolDate(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function nextDirection(last: 'IN' | 'OUT' | null): 'IN' | 'OUT' { return last === 'IN' ? 'OUT' : 'IN'; }
