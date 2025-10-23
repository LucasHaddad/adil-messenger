import { Module } from '@nestjs/common';
import { FileController } from '@/controllers/file.controller';
import { FileUploadService } from '@/services/file-upload.service';

@Module({
  controllers: [FileController],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileModule {}
