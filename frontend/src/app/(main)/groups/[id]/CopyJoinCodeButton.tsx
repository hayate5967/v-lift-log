'use client';

import { useState } from 'react';

export function CopyJoinCodeButton({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(joinCode)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {
            // クリップボードAPIが使えない環境（非HTTPS等）では黙って諦める。
            // 参加コードはこの下に常に表示されているため、手動コピーは可能。
          });
      }}
      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? 'コピーしました' : 'コピー'}
    </button>
  );
}
