import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileUploadService, UploadedFile } from './file-upload.service';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileUploadService', () => {
  let service: FileUploadService;

  const mockFile: UploadedFile = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test file content'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('./uploads'),
          },
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);

    // Mock fs operations
    mockFs.access.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue();
    mockFs.unlink.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const result = await service.uploadFile(mockFile);

      expect(result).toEqual({
        url: '/uploads/mock-uuid-1234.jpg',
        filename: 'mock-uuid-1234.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('mock-uuid-1234.jpg'),
        mockFile.buffer,
      );
    });

    it('should reject file that exceeds size limit', async () => {
      const largeFile: UploadedFile = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB
      };

      await expect(service.uploadFile(largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject unsupported file type', async () => {
      const unsupportedFile: UploadedFile = {
        ...mockFile,
        mimetype: 'application/x-executable',
      };

      await expect(service.uploadFile(unsupportedFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle file write error', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(service.uploadFile(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateFileForMessage', () => {
    it('should validate file successfully', () => {
      expect(() => service.validateFileForMessage(mockFile)).not.toThrow();
    });

    it('should pass validation when no file provided', () => {
      expect(() => service.validateFileForMessage(null)).not.toThrow();
    });

    it('should reject file that exceeds size limit', () => {
      const largeFile: UploadedFile = {
        ...mockFile,
        size: 15 * 1024 * 1024,
      };

      expect(() => service.validateFileForMessage(largeFile)).toThrow(
        BadRequestException,
      );
    });

    it('should reject unsupported file type', () => {
      const unsupportedFile: UploadedFile = {
        ...mockFile,
        mimetype: 'application/x-malware',
      };

      expect(() => service.validateFileForMessage(unsupportedFile)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('utility methods', () => {
    it('should generate correct file URL', () => {
      const url = service.getFileUrl('test-file.jpg');
      expect(url).toBe('/uploads/test-file.jpg');
    });
  });
});
