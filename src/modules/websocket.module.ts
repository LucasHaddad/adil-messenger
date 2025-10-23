import { Module, forwardRef } from "@nestjs/common";
import { ChatGateway } from "@/gateways/chat.gateway";
import { MessageModule } from "@/modules/message.module";

@Module({
  imports: [forwardRef(() => MessageModule)],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class WebSocketModule {}
