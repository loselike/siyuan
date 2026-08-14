import { Injectable, type PipeTransform } from '@nestjs/common';

export type RuntimeInputParser<T> = (value: unknown) => T;

/**
 * Bridges a narrow runtime parser into Nest without coupling the parser to a
 * controller. Slices can adopt this incrementally while existing valid API
 * contracts remain unchanged.
 */
@Injectable()
export class RuntimeInputPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly parse: RuntimeInputParser<T>) {}

  transform(value: unknown): T {
    return this.parse(value);
  }
}
