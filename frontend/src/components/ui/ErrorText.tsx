export function ErrorText({ children }: { children?: string }) {
  if (!children) {
    return null;
  }
  return (
    <p className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}
