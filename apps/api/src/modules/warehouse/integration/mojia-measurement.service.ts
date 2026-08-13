import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger
} from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import { WarehouseInventoryQueryService } from '../inventory/warehouse-inventory-query.service.js';
import {
  MOJIA_MEASUREMENT_REPOSITORY,
  type MojiaMeasurementRepository
} from './mojia-measurement.repository.js';

const MOJIA_REQUEST_SAMPLE_RETENTION_MS = 72 * 60 * 60 * 1000;
const MOJIA_REQUEST_SAMPLE_MAX_BYTES = 16 * 1024;
const MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES = 100;
const MOJIA_REQUEST_SAMPLE_WRITE_CONCURRENCY = 2;

export type MojiaMeasurementInput = {
  orderNo?: unknown;
  barcode?: unknown;
  customerCode?: unknown;
  trackingNo?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
  weight?: unknown;
  lengthCm?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  packageCount?: unknown;
  packageIndex?: unknown;
  expectedTotalPackageCount?: unknown;
  measuredAt?: unknown;
  machineNo?: unknown;
  deviceNo?: unknown;
};

type WarehousePackageCreateInput = Parameters<MojiaMeasurementRepository['createWarehousePackage']>[1];

const mojiaPrincipal: Principal = {
  id: 'system-mojia-device',
  username: 'mojia-device',
  role: 'WAREHOUSE',
  name: '墨家设备'
};

@Injectable()
export class MojiaMeasurementService {
  private readonly logger = new Logger('DataController');
  private readonly requestSampleWriteQueue: Array<{
    run: () => void;
    drop: () => void;
    priority: boolean;
  }> = [];
  private requestSampleActiveWrites = 0;

  constructor(
    @Inject(MOJIA_MEASUREMENT_REPOSITORY)
    private readonly repository: MojiaMeasurementRepository,
    @Inject(WarehouseInventoryQueryService)
    private readonly warehouseInventoryQueries: WarehouseInventoryQueryService
  ) {}

  async receive(body: MojiaMeasurementInput) {
    const startedAt = Date.now();
    const measurement = body && typeof body === 'object' ? body : {};
    const sampleId = this.createRequestSample(measurement);
    try {
      const barcode = String(measurement.barcode ?? measurement.orderNo ?? '').trim();
      if (barcode) {
        const matched = await this.repository.applyWarehouseTallyMeasurementByBarcode(mojiaPrincipal, {
          barcode,
          weightKg: positiveNumber(measurement.weightKg ?? measurement.weight, 'weight'),
          lengthCm: positiveNumber(measurement.lengthCm ?? measurement.length, 'length'),
          widthCm: positiveNumber(measurement.widthCm ?? measurement.width, 'width'),
          heightCm: positiveNumber(measurement.heightCm ?? measurement.height, 'height'),
          measuredAt: normalizeMojiaMeasuredAt(measurement.measuredAt),
          deviceNo: String(measurement.deviceNo ?? measurement.machineNo ?? '').trim() || undefined
        });
        if (matched) {
          this.completeRequestSample(sampleId, 'SUCCESS', matched.package.id);
          return { result: 'true', message: `${matched.package.labelNo} ${matched.alreadyApplied ? '已接收' : '复测覆盖成功'}` };
        }
      }
      const input = toWarehousePackageInput(measurement);
      const duplicate = await this.warehouseInventoryQueries.findDuplicateMojiaPackage(mojiaPrincipal, {
        combinedOrderNo: input.combinedOrderNo as string,
        scanTime: input.scanTime,
        remark: input.remark
      });
      if (duplicate) {
        this.completeRequestSample(sampleId, 'SUCCESS');
        return { result: 'true', message: `${duplicate.combinedOrderNo} 已接收` };
      }
      const created = await this.repository.createWarehousePackage(mojiaPrincipal, input);
      this.completeRequestSample(sampleId, 'SUCCESS', created.id);
      return { result: 'true', message: `${created.combinedOrderNo} 录入成功` };
    } catch (error) {
      const message = error instanceof Error ? error.message : '录入失败';
      this.completeRequestSample(sampleId, 'FAILED', undefined, message);
      await this.recordPushFailure(message, startedAt);
      return { result: 'false', message };
    }
  }

  private createRequestSample(body: MojiaMeasurementInput): Promise<string | undefined> {
    try {
      const receivedAt = new Date();
      const parsedPayload = sanitizeMojiaRequestSamplePayload(body as Record<string, unknown>);
      const serialized = JSON.stringify(parsedPayload);
      const originalBytes = Buffer.byteLength(serialized, 'utf8');
      const payload = originalBytes <= MOJIA_REQUEST_SAMPLE_MAX_BYTES
        ? parsedPayload
        : {
            _sampling: {
              omitted: true,
              reason: 'PAYLOAD_TOO_LARGE',
              originalBytes,
              fieldCount: Object.keys(parsedPayload).length,
              fieldNames: Object.keys(parsedPayload).slice(0, 20).map((field) => field.slice(0, 80))
            }
          };
      return this.enqueueRequestSampleWrite(() => this.repository.createMojiaRequestSample({
        deviceNo: String(body.deviceNo ?? body.machineNo ?? '').trim() || undefined,
        payload,
        payloadHash: createHash('sha256').update(serialized).digest('hex'),
        receivedAt,
        expiresAt: new Date(receivedAt.getTime() + MOJIA_REQUEST_SAMPLE_RETENTION_MS)
      }));
    } catch {
      this.logger.warn('墨家请求采样写入失败，业务接收继续执行');
      return Promise.resolve(undefined);
    }
  }

  private completeRequestSample(
    sampleId: Promise<string | undefined>,
    result: 'SUCCESS' | 'FAILED',
    warehousePackageId?: string,
    errorMessage?: string
  ) {
    void sampleId.then((resolvedSampleId) => {
      if (!resolvedSampleId) return;
      void this.enqueueRequestSampleWrite(async () => {
        await this.repository.completeMojiaRequestSample(resolvedSampleId, {
          result,
          warehousePackageId,
          errorMessage: errorMessage?.slice(0, 1000),
          completedAt: new Date()
        });
      }, true);
    });
  }

  private enqueueRequestSampleWrite<T>(task: () => Promise<T>, priority = false): Promise<T | undefined> {
    if (!priority && this.requestSampleWriteQueue.length >= MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES) {
      this.logger.warn('墨家请求采样队列已满，本次采样已丢弃');
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      const queued = {
        priority,
        drop: () => resolve(undefined),
        run: () => {
          this.requestSampleActiveWrites += 1;
          void task()
            .then(resolve)
            .catch(() => {
              this.logger.warn('墨家请求采样后台写入失败，业务接收结果不受影响');
              resolve(undefined);
            })
            .finally(() => {
              this.requestSampleActiveWrites -= 1;
              this.drainRequestSampleWriteQueue();
            });
        }
      };
      if (priority) {
        if (this.requestSampleWriteQueue.length >= MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES) {
          let normalIndex = -1;
          for (let index = this.requestSampleWriteQueue.length - 1; index >= 0; index -= 1) {
            if (!this.requestSampleWriteQueue[index]?.priority) {
              normalIndex = index;
              break;
            }
          }
          if (normalIndex >= 0) this.requestSampleWriteQueue.splice(normalIndex, 1)[0]?.drop();
        }
        this.requestSampleWriteQueue.unshift(queued);
      } else {
        this.requestSampleWriteQueue.push(queued);
      }
      this.drainRequestSampleWriteQueue();
    });
  }

  private drainRequestSampleWriteQueue() {
    while (
      this.requestSampleActiveWrites < MOJIA_REQUEST_SAMPLE_WRITE_CONCURRENCY
      && this.requestSampleWriteQueue.length > 0
    ) {
      this.requestSampleWriteQueue.shift()?.run();
    }
  }

  private async recordPushFailure(message: string, startedAt: number) {
    await this.repository.recordHttpAudit(mojiaPrincipal, {
      method: 'POST',
      path: '/api/integrations/mojia/measurements',
      result: 'FAILED',
      durationMs: Date.now() - startedAt,
      errorMessage: message
    }).catch(() => undefined);
  }
}

function toWarehousePackageInput(body: MojiaMeasurementInput): WarehousePackageCreateInput {
  const barcode = String(body.barcode ?? body.orderNo ?? '').trim();
  const separatorIndex = barcode.search(/[-－—–]/);
  if (!barcode && !body.customerCode) {
    throw new BadRequestException('请填写条码');
  }
  const measuredAt = normalizeMojiaMeasuredAt(body.measuredAt);
  const deviceNo = String(body.deviceNo ?? body.machineNo ?? '').trim();
  const customerOrderNo = String(
    body.customerCode ?? (separatorIndex > 0 ? barcode.slice(0, separatorIndex) : '待补客户')
  ).trim();
  const parsedTrackingNo = separatorIndex > 0 ? barcode.slice(separatorIndex + 1).trim() : '';
  const providedTrackingNo = body.trackingNo !== undefined ? String(body.trackingNo).trim() : parsedTrackingNo;
  const domesticTrackingNo = providedTrackingNo || '待补充';
  const remark = deviceNo ? `设备号：${deviceNo}` : '';
  return {
    customerCode: customerOrderNo,
    customerOrderNo,
    domesticTrackingNo,
    combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
    expectedTotalPackageCount: positiveInt(body.expectedTotalPackageCount, 1),
    packageIndex: positiveInt(body.packageIndex, 1),
    packageCount: positiveInt(body.packageCount, 1),
    weightKg: positiveNumber(body.weightKg ?? body.weight, 'weight'),
    lengthCm: positiveNumber(body.lengthCm ?? body.length, 'length'),
    widthCm: positiveNumber(body.widthCm ?? body.width, 'width'),
    heightCm: positiveNumber(body.heightCm ?? body.height, 'height'),
    scanTime: measuredAt,
    scanSource: '墨家设备',
    remark: remark || undefined
  };
}

function sanitizeMojiaRequestSamplePayload(value: Record<string, unknown>): Record<string, unknown> {
  return sanitizeMojiaRequestSampleValue(value, 0) as Record<string, unknown>;
}

function sanitizeMojiaRequestSampleValue(value: unknown, depth: number): unknown {
  if (!value || typeof value !== 'object') return value;
  if (depth >= 8) return '[OMITTED_MAX_DEPTH]';
  if (Array.isArray(value)) return value.map((item) => sanitizeMojiaRequestSampleValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    isMojiaRequestSampleSensitiveKey(key)
      ? '[REDACTED]'
      : sanitizeMojiaRequestSampleValue(child, depth + 1)
  ]));
}

function isMojiaRequestSampleSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return /密码|令牌|密钥|签名|口令|凭证/.test(key)
    || normalized === 'auth'
    || normalized === 'jwt'
    || normalized === 'bearer'
    || normalized.includes('authorization')
    || normalized.endsWith('token')
    || normalized.endsWith('password')
    || normalized.endsWith('passwd')
    || normalized.endsWith('pwd')
    || normalized.endsWith('secret')
    || normalized.endsWith('credential')
    || normalized.endsWith('cookie')
    || normalized.endsWith('apikey')
    || normalized.endsWith('accesskey')
    || normalized.endsWith('privatekey')
    || normalized.endsWith('sessionid')
    || normalized.endsWith('sessionkey')
    || normalized.endsWith('signature')
    || normalized === 'sign';
}

function positiveNumber(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new BadRequestException(`${field} 必须是大于 0 的数字`);
  }
  return numberValue;
}

function positiveInt(value: unknown, fallback: number): number {
  const numberValue = Math.floor(Number(value) || fallback);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeMojiaMeasuredAt(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  const normalizedRaw = raw.replace(/^(\d{4})[./](\d{1,2})[./](\d{1,2})[ T/](\d{1,2}:\d{1,2}(?::\d{1,2})?)$/, '$1-$2-$3 $4');
  const date = Number.isFinite(numeric)
    ? new Date(raw.length <= 10 ? numeric * 1000 : numeric)
    : new Date(normalizedRaw);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setMilliseconds(0);
  return date.toISOString();
}
