import { Body, Controller, Delete, Get, Inject, Param, Put, Req } from '@nestjs/common';
import { RequireAuth } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';
import {
  parseUserTablePreferenceKey,
  parseUserTablePreferenceValue,
  UserTablePreferenceService
} from './user-table-preference.service.js';

@Controller('user-table-preferences')
export class UserTablePreferenceController {
  constructor(@Inject(UserTablePreferenceService) private readonly preferences: UserTablePreferenceService) {}

  @Get()
  @RequireAuth()
  list(@Req() request: { user: Principal }) {
    return this.preferences.list(request.user);
  }

  @Put(':key')
  @RequireAuth()
  upsert(
    @Req() request: { user: Principal },
    @Param('key') key: string,
    @Body() input: { value?: unknown }
  ) {
    return this.preferences.upsert(
      request.user,
      parseUserTablePreferenceKey(key),
      parseUserTablePreferenceValue(input.value)
    );
  }

  @Delete(':key')
  @RequireAuth()
  remove(@Req() request: { user: Principal }, @Param('key') key: string) {
    return this.preferences.remove(request.user, parseUserTablePreferenceKey(key));
  }
}
