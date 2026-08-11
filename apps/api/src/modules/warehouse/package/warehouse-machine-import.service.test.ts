import { createHash } from 'node:crypto';
import * as xlsx from '@e965/xlsx';
import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseMachineImportRepository } from './warehouse-machine-import.repository.js';
import {
  WarehouseMachineImportService,
  type WarehouseMachineImportFile
} from './warehouse-machine-import.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;

function repositoryStub(
  overrides: Partial<WarehouseMachineImportRepository> = {}
): WarehouseMachineImportRepository {
  return {
    previewWarehouseMachineImport: vi.fn(),
    importWarehouseMachineImport: vi.fn(),
    ...overrides
  };
}

function workbookFile(originalname = 'machine-phase18.xlsx'): WarehouseMachineImportFile {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
    ['条码', '实重', '长度', '宽度', '高度', '件数'],
    ['9409-KY-PH18-SERVICE', 10, 40, 30, 20, 2]
  ]), '机器过机数据');
  const buffer = Buffer.from(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  return {
    originalname,
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer
  };
}

describe('WarehouseMachineImportService', () => {
  it('preserves preview parsing and result passthrough', async () => {
    const result = { committed: false, importableRows: 1 };
    const repository = repositoryStub({
      previewWarehouseMachineImport: vi.fn().mockResolvedValue(result)
    });
    const service = new WarehouseMachineImportService(repository);
    const file = workbookFile('../machine-phase18.xlsx');

    await expect(service.execute(principal, file, 'false')).resolves.toBe(result);
    expect(repository.previewWarehouseMachineImport).toHaveBeenCalledWith(
      principal,
      expect.objectContaining({
        fileName: '.._machine-phase18.xlsx',
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        duplicateFileRows: 0,
        candidates: [expect.objectContaining({ barcode: '9409-KY-PH18-SERVICE', packageCount: 2 })]
      })
    );
    expect(repository.importWarehouseMachineImport).not.toHaveBeenCalled();
  });

  it('preserves case-insensitive commit selection and exact file hash', async () => {
    const result = { committed: true, importedRows: 1 };
    const repository = repositoryStub({
      importWarehouseMachineImport: vi.fn().mockResolvedValue(result)
    });
    const service = new WarehouseMachineImportService(repository);
    const file = workbookFile();

    await expect(service.execute(principal, file, 'TRUE')).resolves.toBe(result);
    expect(repository.importWarehouseMachineImport).toHaveBeenCalledWith(
      principal,
      expect.objectContaining({ totalRows: 1, validRows: 1 }),
      { fileHash: createHash('sha256').update(file.buffer).digest('hex') }
    );
    expect(repository.previewWarehouseMachineImport).not.toHaveBeenCalled();
  });

  it('preserves application/octet-stream compatibility for valid workbooks', async () => {
    const result = { committed: false, importableRows: 1 };
    const repository = repositoryStub({
      previewWarehouseMachineImport: vi.fn().mockResolvedValue(result)
    });
    const service = new WarehouseMachineImportService(repository);
    const file = { ...workbookFile(), mimetype: 'application/octet-stream' };

    await expect(service.execute(principal, file)).resolves.toBe(result);
    expect(repository.previewWarehouseMachineImport).toHaveBeenCalledOnce();
  });

  it('preserves missing and invalid file rejection messages before repository access', () => {
    const repository = repositoryStub();
    const service = new WarehouseMachineImportService(repository);

    expect(() => service.execute(principal, undefined)).toThrow('请上传机器过机 Excel 文件');
    expect(() => service.execute(principal, {
      originalname: 'machine-phase18.txt',
      mimetype: 'text/plain',
      size: 5,
      buffer: Buffer.from('wrong')
    })).toThrow('仅支持 .xls/.xlsx Excel 文件');
    expect(repository.previewWarehouseMachineImport).not.toHaveBeenCalled();
    expect(repository.importWarehouseMachineImport).not.toHaveBeenCalled();
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing import rejection');
    const repository = repositoryStub({
      previewWarehouseMachineImport: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehouseMachineImportService(repository);

    await expect(service.execute(principal, workbookFile())).rejects.toBe(failure);
  });
});
