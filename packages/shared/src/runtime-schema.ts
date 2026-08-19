export class RuntimeInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeInputValidationError';
  }
}

export interface RuntimeSchema<T> {
  parse(value: unknown): T;
}

export function defineRuntimeSchema<T>(parse: (value: unknown) => T): RuntimeSchema<T> {
  return Object.freeze({ parse });
}
