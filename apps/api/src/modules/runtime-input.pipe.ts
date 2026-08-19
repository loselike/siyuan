import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import {
  RuntimeInputValidationError,
  type RuntimeSchema
} from '@siyuan/shared/runtime-schema';

export type RuntimeInputParser<T> = (value: unknown) => T;
type RuntimeInputSource<T> = RuntimeInputParser<T> | RuntimeSchema<T>;

/**
 * Bridges a narrow runtime parser into Nest without coupling the parser to a
 * controller. Slices can adopt this incrementally while existing valid API
 * contracts remain unchanged.
 */
@Injectable()
export class RuntimeInputPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly source: RuntimeInputSource<T>) {}

  transform(value: unknown): T {
    try {
      return typeof this.source === 'function'
        ? this.source(value)
        : this.source.parse(value);
    } catch (error) {
      if (error instanceof RuntimeInputValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
