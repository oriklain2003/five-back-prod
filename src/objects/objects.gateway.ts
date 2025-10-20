import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MapObjectData } from './classes';

@WebSocketGateway({ cors: { origin: '*' } })
export class ObjectsGateway {
  @WebSocketServer()
  server: Server;

  private objectsService: any; // Will be injected via setter

  emitObjectChange(object: MapObjectData): void {
    this.server.emit('objectChange', object);
  }

  emitObjectDelete(objectId: string): void {
    this.server.emit('objectDelete', { id: objectId });
  }

  emitChatMessage(message: string, sender: string, buttons?: Array<{label: string; action: string; data?: any}>, objectData?: any): void {
    this.server.emit('chatMessage', { message, sender, timestamp: new Date(), buttons, objectData });
  }

  setObjectsService(service: any): void {
    this.objectsService = service;
  }

  @SubscribeMessage('approveClassification')
  async handleApproveClassification(client: Socket, payload: { objectData: any }): Promise<void> {
    console.log(`Classification approval requested for object: ${payload.objectData?.id}`);
    if (this.objectsService) {
      await this.objectsService.approveClassification(payload.objectData);
    }
  }

  @SubscribeMessage('removeSpecialTrail')
  handleRemoveSpecialTrail(client: Socket, payload: { objectId: string }): void {
    console.log(`Remove special trail requested for object: ${payload.objectId}`);
    // Broadcast to all clients to remove the special trail
    this.server.emit('removeSpecialTrail', { objectId: payload.objectId });
  }
}
  
