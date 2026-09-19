"use client";

import { useFormStatus } from "react-dom";

function Inner({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Delete “${title}”? This also removes its uploaded media.`)) {
          event.preventDefault();
        }
      }}
      className="text-sm text-ink-muted transition-colors hover:text-critical disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteProductButton({
  id,
  title,
  action,
}: {
  id: string;
  title: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Inner title={title} />
    </form>
  );
}
