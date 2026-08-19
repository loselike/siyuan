import { BadRequestException } from '@nestjs/common';
import { RuntimeInputValidationError, defineRuntimeSchema } from '@siyuan/shared/runtime-schema';
import { describe, expect, it } from 'vitest';
import { RuntimeInputPipe } from './runtime-input.pipe.js';

describe('RuntimeInputPipe', () => {
  it('maps shared validation failures to the stable HTTP 400 contract', () => {
    const pipe = new RuntimeInputPipe(defineRuntimeSchema(() => {
      throw new RuntimeInputValidationError('请求参数无效');
    }));

    expect(() => pipe.transform({})).toThrow(new BadRequestException('请求参数无效'));
  });

  it('keeps successful transformations and unrelated failures unchanged', () => {
    const transformingPipe = new RuntimeInputPipe(defineRuntimeSchema((value) => Number(value)));
    expect(transformingPipe.transform('2')).toBe(2);

    const failure = new Error('repository-independent failure');
    const failingPipe = new RuntimeInputPipe(() => { throw failure; });
    expect(() => failingPipe.transform({})).toThrow(failure);
  });
});
