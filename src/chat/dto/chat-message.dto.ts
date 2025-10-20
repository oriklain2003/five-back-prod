import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'User question', example: 'What is the status?' })
  question: string;

  @ApiProperty({ 
    required: false, 
    description: 'Current object context (full object data)',
    example: { id: 'target-123', position: [35.0, 32.0, 3000], speed: 150 }
  })
  currentObject?: any;

  @ApiProperty({
    required: false,
    description: 'Recent conversation history from the client',
    example: [
      { role: 'user', content: 'What is this target?' },
      { role: 'assistant', content: 'This is a drone...' }
    ]
  })
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;

  @ApiProperty({
    required: false,
    description: 'Optional client-provided summary of the conversation so far (UI-only data)'
  })
  clientSummary?: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'Bot response' })
  response: string;
}

