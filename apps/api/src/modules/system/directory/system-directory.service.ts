import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  SYSTEM_DIRECTORY_REPOSITORY,
  type SystemDirectoryRepository
} from './system-directory.repository.js';

@Injectable()
export class SystemDirectoryService {
  constructor(@Inject(SYSTEM_DIRECTORY_REPOSITORY) private readonly repository: SystemDirectoryRepository) {}

  getDepartments(principal: Principal) {
    return this.repository.getDepartments(principal);
  }

  getSites(principal: Principal) {
    return this.repository.getSites(principal);
  }
}
