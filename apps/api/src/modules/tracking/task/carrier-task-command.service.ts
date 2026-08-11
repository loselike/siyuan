import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  CARRIER_TASK_COMMAND_REPOSITORY,
  type CarrierTaskCommandRepository
} from './carrier-task-command.repository.js';

@Injectable()
export class CarrierTaskCommandService {
  constructor(
    @Inject(CARRIER_TASK_COMMAND_REPOSITORY)
    private readonly repository: CarrierTaskCommandRepository
  ) {}

  run(principal: Principal, taskId: string, body: { fail?: boolean } | undefined) {
    this.assertStaff(principal, '客户不能执行承运商任务');
    return this.repository.runCarrierTask(principal, taskId, body);
  }

  retry(principal: Principal, taskId: string, body: { fail?: boolean } | undefined) {
    this.assertStaff(principal, '客户不能重试承运商任务');
    return this.repository.retryCarrierTask(principal, taskId, body);
  }

  private assertStaff(principal: Principal, message: string) {
    if (principal.role === 'CUSTOMER') throw new ForbiddenException(message);
  }
}
