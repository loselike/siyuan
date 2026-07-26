import type { LegacyPricingQuoteRequest } from '@siyuan/shared';

export type LegacyCargoProfileInput = Pick<LegacyPricingQuoteRequest, 'productName' | 'packageInfo' | 'lengthCm' | 'widthCm' | 'heightCm' | 'packageCount' | 'volumeCbm' | 'unitActualWeightKg' | 'actualWeightKg' | 'chargeableWeightKg'>;

export type LargeCargoProfile = {
  isLargeCargo: boolean;
  reasons: string[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function numericInput(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function createLargeCargoProfile(input: LegacyCargoProfileInput): LargeCargoProfile {
  const reasons: string[] = [];
  const lengthCm = numericInput(input.lengthCm);
  const widthCm = numericInput(input.widthCm);
  const heightCm = numericInput(input.heightCm);
  if (lengthCm > 180) reasons.push(`长度 ${roundMoney(lengthCm)}cm 超过 180cm`);
  if (widthCm > 80) reasons.push(`宽度 ${roundMoney(widthCm)}cm 超过 80cm`);
  if (heightCm > 80) reasons.push(`高度 ${roundMoney(heightCm)}cm 超过 80cm`);
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    const singleVolumeCbm = (lengthCm * widthCm * heightCm) / 1_000_000;
    if (singleVolumeCbm > 0.15) {
      reasons.push(`单件体积 ${singleVolumeCbm.toFixed(3)}CBM 超过 0.15CBM`);
    }
  }
  const cargoText = `${input.productName ?? ''} ${input.packageInfo ?? ''}`;
  if (/大件|超大件|家具|桌|椅|沙发|床|木箱|木架|托盘|卡板|打托/i.test(cargoText)) {
    reasons.push('品名/包装包含大件关键词');
  }
  return { isLargeCargo: reasons.length > 0, reasons };
}

export function largeCargoRedirectMessage(profile: LargeCargoProfile): string {
  return `${profile.reasons.join('、') || '当前货物属于大件/超大件'}，应走欧洲超大件综合查询`;
}

export function isEuropeTransportMode(value: unknown): value is 'AIR' | 'SEA' | 'RAIL' | 'SEA_RAIL' {
  return value === 'AIR' || value === 'SEA' || value === 'RAIL' || value === 'SEA_RAIL';
}
