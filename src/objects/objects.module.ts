import { Module } from '@nestjs/common';
import { ObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';
import { ObjectsGateway } from './objects.gateway';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [ObjectsController],
  providers: [ObjectsService, ObjectsGateway],
})
export class ObjectsModule {}

