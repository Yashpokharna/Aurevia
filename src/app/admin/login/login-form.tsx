"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction, type FormState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 h-12 w-full rounded-md bg-ink text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Checking…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="mt-8">
      <label htmlFor="password" className="block text-sm font-medium text-ink">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        autoFocus
        className="mt-2 h-12 w-full rounded-md border border-line bg-canvas px-4 text-sm text-ink outline-none transition-colors focus:border-brass"
      />

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-critical">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
