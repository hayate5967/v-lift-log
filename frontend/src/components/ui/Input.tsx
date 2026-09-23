import { InputHTMLAttributes, forwardRef } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = '', ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-zinc-700">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={`rounded-lg border border-zinc-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
        {...props}
      />
    </label>
  );
});
