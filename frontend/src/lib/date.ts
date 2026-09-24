/**
 * 記録のperformedAtは「日付のみ」を表すが、backendはDate型(UTC midnight)として
 * 保存・返却する（例: "2026-01-01T00:00:00.000Z"）。これをnew Date(...)経由で
 * ローカルタイムゾーンに変換して表示すると、UTCより遅れるタイムゾーンでは
 * 前日にずれてしまう。日付部分の文字列を直接組み立てることでタイムゾーンに
 * 依存しない表示にする。
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${year}/${month}/${day}`;
}

/** グラフの軸ラベルなど、月日のみで十分な場面向け。 */
export function formatMonthDay(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-');
  return `${Number(month)}/${Number(day)}`;
}
