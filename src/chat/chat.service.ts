import { Injectable } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from './dto/chat-message.dto';
import OpenAI from 'openai';

export interface SystemMessageOptions {
  message: string;
  sender?: string;
  buttons?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
  objectData?: any;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class ChatService {
  private systemMessages: Array<{ message: string; sender: string; timestamp: Date; buttons?: Array<{label: string; action: string; data?: any}> }> = [];
  private conversationHistory: ConversationMessage[] = [];
  private openai: OpenAI;
  private openaiApiKey: string;
  private currentObjectContext: any = null;
  private baseSystemMessage: string;
  private chatMessageCallback: ((message: string, sender: string, buttons?: Array<{label: string; action: string; data?: any}>, objectData?: any) => void) | null = null;

  constructor() {
    // Initialize OpenAI with API key
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.openai = new OpenAI({
      apiKey: this.openaiApiKey,
    });

    // Set the base system context message (tight guardrails to prevent hallucinations)
    this.baseSystemMessage = [
      'FIVE Operational Assistant – Strict Response Policy:',
      '- Use ONLY information explicitly present in: CURRENT TARGET SNAPSHOT, client conversation history, client summary, or system messages.',
      '- If data is missing or uncertain, answer: "לא ידוע" and, if helpful, ask ONE concise clarifying question.',
      '- Do NOT invent numbers, locations, times, radar names, or events.',
      '- Use the units shown in the data (knots, feet, km). Do not convert unless asked.',
      '- Prefer Hebrew (עברית). Keep answers short and operational (1–3 sentences) unless asked for details.',
      '- When referencing facts, ground them in the visible fields (ID, Pos/Alt, Speed, Heading, Classification, Origin, Distance, Time, QnA).',
      '',
      'Classification Policy (authoritative):',
      "- Treat 'drone', 'rocket', and 'arrow' with no classification data as hostile (denforas target).",
      "- Treat 'plane', 'bird', and 'jet' as good (non-hostile) targets unless explicit hostile evidence is present.",
      "- Semantic note: 'jet' = 'fighter jet' (מטוס קרב).",
      '',
      '',
      'אתה FIVE – סוכן הבינה המלאכותית (AI) המבצעי של מערך הבקרה האווירית הישראלי. משימתך היא להעצים ולגבות את מפקדי ומפעילי התמונה האווירית, תוך שמירה על עליונות אווירית והגנה על שמי המדינה מפני כל איום. אינך מקבל החלטות סופיות, אלא משרת כרשת הביטחון הקוגניטיבית וכיועץ המבצעי המהיר ביותר.',
      'משימות קריטיות: גילוי, סיווג, פעולה, ושימור ידע. טון: חד, ברור, תכליתי, צבאי.',
    ].join('\n');

    // Set the initial system message
    this.conversationHistory.push({
      role: 'system',
      content: this.baseSystemMessage,
    });
  }

  private getCompassDirection(degrees: number): string {
    // Normalize degrees to 0-360 range
    const normalized = ((degrees % 360) + 360) % 360;
    
    const directions = [
      { name: 'North', min: 337.5, max: 360 },
      { name: 'North', min: 0, max: 22.5 },
      { name: 'North-East', min: 22.5, max: 67.5 },
      { name: 'East', min: 67.5, max: 112.5 },
      { name: 'South-East', min: 112.5, max: 157.5 },
      { name: 'South', min: 157.5, max: 202.5 },
      { name: 'South-West', min: 202.5, max: 247.5 },
      { name: 'West', min: 247.5, max: 292.5 },
      { name: 'North-West', min: 292.5, max: 337.5 },
    ];
    
    for (const dir of directions) {
      if (normalized >= dir.min && normalized < dir.max) {
        return dir.name;
      }
    }
    
    return 'North';
  }

  private updateSystemMessage(): void {
    let systemContent = this.baseSystemMessage;

    // Add current object context if available (concise)
    if (this.currentObjectContext) {
      systemContent += `\n\n=== CURRENT TARGET SNAPSHOT (concise) ===\n`;
      const id = this.currentObjectContext.id ? `ID: ${this.currentObjectContext.id}\n` : '';
      const name = this.currentObjectContext.name ? `Name: ${this.currentObjectContext.name}\n` : '';
      const pos = (() => {
        if (this.currentObjectContext.position && this.currentObjectContext.position.length >= 3) {
          const [lng, lat, alt] = this.currentObjectContext.position;
          return `Pos: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° | Alt: ${alt}ft\n`;
        }
        if (this.currentObjectContext.plots?.[0]?.position) {
          const [lng, lat, alt] = this.currentObjectContext.plots[0].position;
          return `Pos: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° | Alt: ${alt}ft\n`;
        }
        return '';
      })();
      const spd = this.currentObjectContext.speed !== undefined ? `Speed: ${this.currentObjectContext.speed}kn\n` : '';
      const dir = (() => {
        if (this.currentObjectContext.rotation !== undefined && this.currentObjectContext.rotation !== null) {
          const compassDirection = this.getCompassDirection(this.currentObjectContext.rotation);
          return `Heading: ${this.currentObjectContext.rotation}° (${compassDirection})\n`;
        }
        return '';
      })();
      const cls = (() => {
        const parts: string[] = [];
        const c = this.currentObjectContext.classification;
        if (c?.current_identification) parts.push(`Type: ${c.current_identification}`);
        if (c?.suggested_identification) parts.push(`Suggest: ${c.suggested_identification}`);
        if (c?.certainty_percentage !== undefined && c?.certainty_percentage !== null) parts.push(`Certainty: ${c.certainty_percentage}%`);
        return parts.length ? parts.join(' | ') + '\n' : '';
      })();
      const org = this.currentObjectContext.origin_country ? `Origin: ${this.currentObjectContext.origin_country}\n` : '';
      const dist = this.currentObjectContext.distance_from_origin !== undefined ? `Distance from origin: ${this.currentObjectContext.distance_from_origin.toFixed(2)} km\n` : '';
      const now = new Date();
      const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeLine = `Time: ${timeStr}\n`;
      systemContent += id + name + pos + spd + dir + cls + org + dist + timeLine;

      // Add Q&A data if available (capped)
      if (this.currentObjectContext.qna && this.currentObjectContext.qna.length > 0) {
        systemContent += `\nQnA (use these first if relevant):\n`;
        const maxItems = 6;
        this.currentObjectContext.qna.slice(0, maxItems).forEach((step: any, index: number) => {
          systemContent += `Q${index + 1}: ${step.question}\n`;
          step.answers.forEach((answer: string, ansIndex: number) => {
            const label = step.answers.length === 1 ? 'A' : `A${ansIndex + 1}`;
            systemContent += `${label}: ${answer}\n`;
          });
        });
        if (this.currentObjectContext.qna.length > maxItems) {
          systemContent += `(+ more QnA omitted for brevity)\n`;
        }
      }
    }

    // Update the system message (always first in history)
    this.conversationHistory[0] = {
      role: 'system',
      content: systemContent,
    };
  }

  async processMessage(chatMessageDto: ChatMessageDto): Promise<ChatResponseDto> {
    try {
      // Update current object context if provided in the request
      if (chatMessageDto.currentObject) {
        this.currentObjectContext = chatMessageDto.currentObject;
      }

      // Update system message with current object context
      this.updateSystemMessage();

      // Build messages array for OpenAI
      const messages: ConversationMessage[] = [
        this.conversationHistory[0], // System message
      ];

      // Merge client snapshot with recent server-side history (deduped)
      const serverRecent = this.conversationHistory
        .slice(1) // exclude system prompt
        .slice(-20)
        .filter(m => m.role === 'user' || m.role === 'assistant');
      const combined: ConversationMessage[] = [];
      const seen = new Set<string>();
      const pushUnique = (arr: ConversationMessage[]) => {
        for (const m of arr) {
          const key = `${m.role}|${m.content}`;
          if (!seen.has(key)) {
            combined.push({ role: m.role, content: m.content });
            seen.add(key);
          }
        }
      };
      if (chatMessageDto.conversationHistory && chatMessageDto.conversationHistory.length > 0) {
        // map incoming DTO items into ConversationMessage type
        pushUnique(chatMessageDto.conversationHistory as unknown as ConversationMessage[]);
      }
      pushUnique(serverRecent);
      messages.push(...combined.slice(-20));

      // If client provided a rolling summary, include it as a system note after the main system prompt
      if (chatMessageDto.clientSummary && chatMessageDto.clientSummary.trim().length > 0) {
        messages.push({
          role: 'system',
          content: `Client summary of prior chat and situation (UI-only, authoritative over history truncation):\n${chatMessageDto.clientSummary}`,
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: chatMessageDto.question,
      });

      console.log('Sending to OpenAI with', messages.length, 'messages');

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: messages,
        max_tokens: 260,
        temperature: 0.0,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
      });
      console.log(messages);
      const assistantResponse = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';

      // Update local conversation history for reference
      this.conversationHistory.push({
        role: 'user',
        content: chatMessageDto.question,
      });
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantResponse,
      });

      // Keep local history manageable (last 20 messages + system message)
      if (this.conversationHistory.length > 21) {
        this.conversationHistory = [
          this.conversationHistory[0], // Keep system message
          ...this.conversationHistory.slice(-20), // Keep last 20 messages
        ];
      }

      return {
        response: assistantResponse,
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // Fallback response
      return {
        response: 'Error: Unable to process your request at this time. Please try again.',
      };
    }
  }

  /**
   * Summarize a list of messages into a concise, high-signal memory string.
   * Used by UI to maintain rolling memory without relying on DB state.
   */
  async summarizeMessages(rawMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<{ summary: string }> {
    try {
      const systemInstruction: ConversationMessage = {
        role: 'system',
        content: [
          'You are a summarizer for an operational air-control assistant. Summarize the conversation into a brief, high-signal memory. ',
          '- Keep under 1200 characters. ',
          '- Include target identifiers, current parameters (speed, altitude, classification, origin, timing), and any decisions/recommendations given. ',
          '- Include key Q&A facts mentioned. ',
          '- Prefer Hebrew (עברית) if the content is in Hebrew. ',
          '- No filler, only facts and outcomes. '
        ].join('')
      };

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          systemInstruction,
          ...rawMessages.map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 400,
        temperature: 0.1,
      });

      const summary = completion.choices[0].message.content || '';
      return { summary };
    } catch (error) {
      console.error('Error summarizing messages:', error);
      return { summary: '' };
    }
  }

  /**
   * Send a system notification message that can be retrieved by clients
   */
  sendSystemMessage(options: SystemMessageOptions): void {
    const message = {
      message: options.message,
      sender: options.sender || 'System',
      timestamp: new Date(),
      buttons: options.buttons,
      objectData: options.objectData,
    };
    
    this.systemMessages.push(message);
    
    // Keep only last 100 messages
    if (this.systemMessages.length > 100) {
      this.systemMessages = this.systemMessages.slice(-100);
    }

    // Append to conversation history as assistant content so future AI turns have realtime context
    const historyContent = `${message.sender ? '[' + message.sender + '] ' : ''}${message.message}`;
    this.conversationHistory.push({
      role: 'assistant',
      content: historyContent,
    });
    if (this.conversationHistory.length > 21) {
      this.conversationHistory = [
        this.conversationHistory[0],
        ...this.conversationHistory.slice(-20),
      ];
    }

    // Emit via callback if registered
    if (this.chatMessageCallback) {
      this.chatMessageCallback(message.message, message.sender, message.buttons, message.objectData);
    }
  }

  /**
   * Register a callback for when system messages are sent
   */
  setChatMessageCallback(callback: (message: string, sender: string, buttons?: Array<{label: string; action: string; data?: any}>, objectData?: any) => void): void {
    this.chatMessageCallback = callback;
  }

  /**
   * Get recent system messages
   */
  getSystemMessages(): Array<{ message: string; sender: string; timestamp: Date; buttons?: Array<{label: string; action: string; data?: any}> }> {
    return this.systemMessages;
  }

  /**
   * Clear conversation history (useful for starting fresh)
   */
  clearConversation(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep only system message
  }

  /**
   * Set the current object context for the conversation
   */
  setCurrentObject(objectData: any): void {
    this.currentObjectContext = objectData;
    this.updateSystemMessage();
  }

  /**
   * Clear the current object context
   */
  clearCurrentObject(): void {
    this.currentObjectContext = null;
    this.updateSystemMessage();
  }

  /**
   * Create a realtime session for voice chat with full context
   */
  async createRealtimeSession(voice: string = 'alloy'): Promise<any> {
    try {
      // Update system message with current context
      this.updateSystemMessage();

      // Build instructions for the realtime AI
      let instructions = this.baseSystemMessage;
      instructions += `\n\n=== VOICE CHAT MODE ===\n`;
      instructions += `You are now in voice chat mode. Keep your responses CLEAR and CONVERSATIONAL.`;
      instructions += `\n- Speak in Hebrew (עברית) when conversing with the operator.`;
      instructions += `\n- Use clear, concise military terminology.`;
      instructions += `\n- When asked about objects, refer to the current object context.`;
      instructions += `\n- If system messages arrive during the conversation, relay them immediately to the operator.`;
      instructions += `\n- Provide complete answers - don't cut yourself off mid-sentence.`;
      instructions += `\n- Be thorough but concise. 2-4 sentences is ideal for most responses.`;
      instructions += `\n- Classification Policy: 'drone', 'rocket', and 'arrow' with no data are denforas (hostile). 'plane', 'bird', and 'jet' are good/non-hostile unless explicit hostile evidence exists. 'jet' means fighter jet.`;

      // Add current object context if available
      if (this.currentObjectContext) {
        instructions += `\n\n=== CURRENTLY SELECTED OBJECT ===\n`;
        instructions += `The operator is currently viewing this object:\n`;
        
        if (this.currentObjectContext.position && this.currentObjectContext.position.length >= 3) {
          const [lng, lat, alt] = this.currentObjectContext.position;
          instructions += `Position: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ${alt} feet\n`;
        }
        if (this.currentObjectContext.speed !== undefined) {
          instructions += `Speed: ${this.currentObjectContext.speed} knots\n`;
        }
        if (this.currentObjectContext.classification?.current_identification) {
          instructions += `Classification: ${this.currentObjectContext.classification.current_identification}\n`;
        }
        if (this.currentObjectContext.id) {
          instructions += `Target ID: ${this.currentObjectContext.id}\n`;
        }
        
        // Add Q&A data if available
        if (this.currentObjectContext.qna && this.currentObjectContext.qna.length > 0) {
          instructions += `\n=== TARGET Q&A INFORMATION ===\n`;
          instructions += `Additional intelligence about this target:\n`;
          
          this.currentObjectContext.qna.forEach((step: any, index: number) => {
            instructions += `Q${index + 1}: ${step.question}\n`;
            step.answers.forEach((answer: string, ansIndex: number) => {
              if (step.answers.length === 1) {
                instructions += `A: ${answer}\n`;
              } else {
                instructions += `A${ansIndex + 1}: ${answer}\n`;
              }
            });
            instructions += `\n`;
          });
          
          instructions += `Use this Q&A information when answering questions about the target.\n`;
        }
      }

      // Build conversation history in the format expected by the realtime API
      const conversation = [];
      
      // Add recent conversation history (last 10 exchanges)
      const recentHistory = this.conversationHistory.slice(-20);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversation.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Create the realtime session
      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: voice,
          instructions: instructions,
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.35,
            prefix_padding_ms: 150,
            silence_duration_ms: 450,
          },
          temperature: 0.6,
          max_response_output_tokens: 600,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Realtime API Error:', errorText);
        throw new Error(`Failed to create realtime session: ${errorText}`);
      }

      const sessionData = await response.json();
      
      // Return session data along with conversation history to send via data channel
      return {
        ...sessionData,
        conversation_history: conversation,
      };
    } catch (error) {
      console.error('Error creating realtime session:', error);
      throw error;
    }
  }

  /**
   * Get formatted conversation history for realtime chat
   */
  getConversationForRealtime(): Array<{ role: string; content: string }> {
    return this.conversationHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-20)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
  }

}

