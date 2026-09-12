interface FieldErrorProps {
  id?: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-bold text-red-700" role="alert">
      {message}
    </p>
  );
}
