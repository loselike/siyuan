import { Body, Controller, Headers, Inject, Post, Query, UnauthorizedException } from '@nestjs/common';
import {
  MojiaMeasurementService,
  type MojiaMeasurementInput
} from './mojia-measurement.service.js';

@Controller()
export class MojiaMeasurementController {
  constructor(
    @Inject(MojiaMeasurementService)
    private readonly measurements: MojiaMeasurementService
  ) {}

  @Post('integrations/mojia/measurements')
  receiveMojiaMeasurement(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('token') queryToken: string | undefined,
    @Body() body: MojiaMeasurementInput
  ) {
    this.ensureMojiaDeviceToken(headers, queryToken);
    return this.measurements.receive(body);
  }

  private ensureMojiaDeviceToken(headers: Record<string, string | string[] | undefined>, queryToken?: string) {
    const expected = process.env.MOJIA_DEVICE_TOKEN?.trim();
    const headerValue = headers['x-device-token'];
    const actual = (Array.isArray(headerValue) ? headerValue[0] : headerValue)?.trim() || queryToken?.trim();
    if (!expected || actual !== expected) {
      throw new UnauthorizedException('设备 token 无效');
    }
  }
}
