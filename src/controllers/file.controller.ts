import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CsrfGuard } from '@/guards/csrf.guard';
import { FileUploadService } from '@/services/file-upload.service';
import * as path from 'path';
import * as fs from 'fs';
import { MimeTypes } from '@/enums/mime-types.enum';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CsrfGuard)
@Controller('api/v1/files')
export class FileController {
  constructor(private fileUploadService: FileUploadService) {}

  @Get(':filename')
  @ApiOperation({
    summary: 'Download or view an uploaded file',
    description: 'Retrieve an uploaded file by its filename',
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const uploadDir = this.fileUploadService.getFileUrl(filename);
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    const mimeType = this.getMimeType(filename);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    return MimeTypes[ext] || 'application/octet-stream';
  }
}
