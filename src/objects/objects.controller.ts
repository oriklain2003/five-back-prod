import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { ObjectsService } from './objects.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { ClassifyObjectDto } from './dto/classify-object.dto';
import { CreateRadarPointDto } from './dto/create-radar-point.dto';
import { MapObjectData } from './classes';
import { RADARS } from './radars.config';

@ApiTags('objects')
@Controller('objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get(':id/change')
  @ApiOperation({ summary: 'Get object and emit change via WebSocket' })
  @ApiParam({ name: 'id', description: 'Object ID' })
  async triggerObjectChange(@Param('id') id: string): Promise<MapObjectData> {
    return this.objectsService.getObjectAndEmit(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create object, save to DB, and emit via WebSocket' })
  @ApiBody({ type: CreateObjectDto })
  async createObject(@Body() createObjectDto: CreateObjectDto): Promise<MapObjectData> {
    return this.objectsService.createObjectAndEmit(createObjectDto);
  }

  @Post('temporary')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Create temporary object and emit via WebSocket (not saved to DB)' })
  @ApiBody({ type: CreateObjectDto })
  setTemporaryObject(@Body() createObjectDto: CreateObjectDto): void {
    this.objectsService.setTemporaryObjectAndEmit(createObjectDto);
  }

  @Post('classify')
  @ApiOperation({ summary: 'Suggest classification for an object and send chat notification' })
  @ApiBody({ type: ClassifyObjectDto })
  async classifyObject(@Body() classifyObjectDto: ClassifyObjectDto): Promise<{ success: boolean }> {
    await this.objectsService.classifyObjectAndNotify(classifyObjectDto);
    return { success: true };
  }

  @Get('radars')
  @ApiOperation({ summary: 'Get list of radar stations' })
  getRadars() {
    return RADARS;
  }

  @Post('radar-point')
  @ApiOperation({ summary: 'Create a radar detection point at specified coordinates' })
  @ApiBody({ type: CreateRadarPointDto })
  createRadarPoint(@Body() createRadarPointDto: CreateRadarPointDto): { success: boolean; id: string } {
    const radarPointId = this.objectsService.createRadarPoint(createRadarPointDto);
    return { success: true, id: radarPointId };
  }
}

