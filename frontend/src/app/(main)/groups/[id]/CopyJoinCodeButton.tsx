'use client';

import { useState } from 'react';

export function CopyJoinCodeButton({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    // navigator.clipboard自体が無い環境（非HTTPS/古いWebView等）では
    // .writeTextへのアクセスが同期的に例外を投げるため、try/catchで囲む
    // （Promiseの.catch()だけでは同期例外を捕まえられない）。
    try {
      navigator.clipboard
        .writeText(joinCode)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          // 黙って諦める。参加コードはこの下に常に表示されているため手動コピーは可能。
        });
    } catch {
      // 同上。
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? 'コピーしました' : 'コピー'}
    </button>
  );
}
