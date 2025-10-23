import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SearchController } from "@/controllers/search.controller";
import { SearchService } from "@/services/search.service";
import { Message } from "@/entities/message.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
