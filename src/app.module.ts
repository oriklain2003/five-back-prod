import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { ObjectsModule } from './objects/objects.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    ObjectsModule,
    ChatModule,
  ],
})
export class AppModule {}

