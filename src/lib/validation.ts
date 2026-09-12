export type FieldErrors = Record<string, string>;

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .+\-\/]*$/;

function lengthCheck(label: string, value: string, min: number, max: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < min) return `${label} must be at least ${min} characters.`;
  if (trimmed.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function validateEquipmentName(label: string, value: string): string | null {
  const lengthError = lengthCheck(label, value, 2, 40);
  if (lengthError) return lengthError;
  if (!NAME_PATTERN.test(value.trim())) {
    return `${label} can only include letters, numbers, spaces, +, -, /, and periods.`;
  }
  return null;
}

export function validateQueryForm(input: { brand: string; model: string; question: string }): FieldErrors {
  const errors: FieldErrors = {};
  const brandError = validateEquipmentName('Brand', input.brand);
  const modelError = validateEquipmentName('Model', input.model);
  const questionError = lengthCheck('Question', input.question, 8, 500);
  if (brandError) errors.brand = brandError;
  if (modelError) errors.model = modelError;
  if (questionError) errors.question = questionError;
  return errors;
}

export function validateIngestForm(input: {
  documentName: string;
  brand: string;
  model: string;
  manualText: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const titleError = lengthCheck('Document title', input.documentName, 3, 120);
  const brandError = validateEquipmentName('Brand', input.brand);
  const modelError = validateEquipmentName('Model', input.model);
  const textError = lengthCheck('Manual text', input.manualText, 50, 200_000);
  if (titleError) errors.documentName = titleError;
  if (brandError) errors.brand = brandError;
  if (modelError) errors.model = modelError;
  if (textError) errors.manualText = textError;
  return errors;
}

export function validateFeedbackNote(note: string): string | null {
  if (note.trim().length > 500) return 'Notes must be 500 characters or fewer.';
  return null;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
