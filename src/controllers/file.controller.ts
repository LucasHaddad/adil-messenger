import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import {
  FileUploadService,
  UploadedFile as CustomUploadedFile,
} from '@/services/file-upload.service';
import * as path from 'path';
import * as fs from 'fs';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CsrfGuard)
@Controller('api/v1/files')
export class FileController {
  constructor(private fileUploadService: FileUploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ upload: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Upload a file for message attachment',
    description:
      'Upload a file that can be attached to messages. Supports images, documents, and other file types.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload (max 10MB)',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const customFile: CustomUploadedFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    const result = await this.fileUploadService.uploadFile(customFile);

    return {
      message: 'File uploaded successfully',
      file: {
        url: result.url,
        filename: result.filename,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        sizeString: this.fileUploadService.getFileSizeString(result.size),
        isImage: this.fileUploadService.isImageFile(result.mimeType),
      },
    };
  }

  @Get(':filename')
  @ApiOperation({
    summary: 'Download or view an uploaded file',
    description: 'Retrieve an uploaded file by its filename',
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const uploadDir = './uploads';
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    const mimeType = this.getMimeType(filename);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);

    if (mimeType.startsWith('image/')) {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
