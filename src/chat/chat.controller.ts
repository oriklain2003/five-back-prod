import { Controller, Post, Body, Get, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatMessageDto, ChatResponseDto } from './dto/chat-message.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a chat message and get AI response from ChatGPT' })
  @ApiBody({ type: ChatMessageDto })
  async sendMessage(@Body() chatMessageDto: ChatMessageDto): Promise<ChatResponseDto> {
    return this.chatService.processMessage(chatMessageDto);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize a list of messages into a concise memory note' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' }
            },
            required: ['role', 'content']
          }
        }
      },
      required: ['messages']
    }
  })
  async summarize(@Body() body: { messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> }): Promise<{ summary: string }> {
    return this.chatService.summarizeMessages(body.messages);
  }

  @Get('system-messages')
  @ApiOperation({ summary: 'Get recent system messages' })
  getSystemMessages(): Array<{ message: string; sender: string; timestamp: Date }> {
    return this.chatService.getSystemMessages();
  }

  @Delete('conversation')
  @ApiOperation({ summary: 'Clear conversation history' })
  clearConversation(): { message: string } {
    this.chatService.clearConversation();
    return { message: 'Conversation history cleared' };
  }

  @Put('current-object')
  @ApiOperation({ summary: 'Set the current object context for the conversation' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        position: { type: 'array', items: { type: 'number' } },
        speed: { type: 'number' },
        size: { type: 'number' },
        classification: { type: 'object' },
        description: { type: 'object' },
        plots: { type: 'array' }
      }
    }
  })
  setCurrentObject(@Body() objectData: any): { message: string } {
    this.chatService.setCurrentObject(objectData);
    return { message: 'Current object context updated' };
  }

  @Delete('current-object')
  @ApiOperation({ summary: 'Clear the current object context' })
  clearCurrentObject(): { message: string } {
    this.chatService.clearCurrentObject();
    return { message: 'Current object context cleared' };
  }

  @Post('realtime-session')
  @ApiOperation({ summary: 'Create an OpenAI Realtime session for voice chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        voice: { type: 'string', enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy' },
      }
    }
  })
  async createRealtimeSession(@Body() body: { voice?: string }): Promise<any> {
    return this.chatService.createRealtimeSession(body.voice || 'alloy');
  }
}

