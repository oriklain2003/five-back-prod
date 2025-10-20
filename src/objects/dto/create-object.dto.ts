import { ApiProperty } from '@nestjs/swagger';
import { PlotData, Classification, ObjectDescription } from '../classes';

export class CreateObjectDto {
  @ApiProperty({ required: false, description: 'Object ID' })
  id: string;

  @ApiProperty({ required: false, description: 'Object name', example: 'FDE145' })
  name?: string | null;

  @ApiProperty({ enum: ['star', 'arrow', 'jet', 'plane', 'drone', 'bird', 'missile'], description: 'Object type' })
  type: 'star' | 'arrow' | 'jet' | 'plane' | 'drone' | 'bird' | 'missile';

  @ApiProperty({ type: [Number], description: 'Position [longitude, latitude, altitude]', example: [34.8, 31.5, 0] })
  position: [number, number, number];

  @ApiProperty({ description: 'Size in pixels', example: 40 })
  size: number;

  @ApiProperty({ required: true, description: 'Speed', example: 0 })
  speed: number;

  @ApiProperty({ required: false, description: 'Rotation in degrees (for arrows)', example: 0 })
  rotation?: number;

  @ApiProperty({ required: false, type: 'array', description: 'History plots', example: [] })
  plots?: PlotData[];

  @ApiProperty({ 
    required: false, 
    description: 'Object classification data (determines color automatically)',
    example: {
      current_identification: 'drone',
      suggested_identification: 'plane',
      suggestion_reason: 'High altitude and speed indicate aircraft',
      certainty_percentage: 85
    }
  })
  classification?: Classification | null;

  @ApiProperty({
    required: false,
    description: 'Object description with tracking metrics',
    example: {
      created_at: '2023-10-01T12:00:00Z',
      avg_speed: 150,
      altitude: 3000,
      starting_point: [34.8, 31.5, 0],
      ending_point: [35.0, 31.7, 3000],
      total_distance: 25000,
      total_direction_changes: 5,
      total_speed_changes: 10,
      total_altitude_changes: 8,
      current_speed: 200,
      coming_from: 'North',
      moving_to: 'South-East',
      distance_from_origin: 25.5,
      origin_country: 'Lebanon'
    }
  })
  description?: ObjectDescription | null;

  @ApiProperty({
    required: false,
    description: 'Additional dynamic details (any key-value pairs)',
    example: {
      radar_signature: 'strong',
      transponder_code: '1234',
      pilot_name: 'John Doe',
      mission_type: 'patrol'
    }
  })
  details?: Record<string, any> | null;

  @ApiProperty({
    required: false,
    description: 'List of radars that detected this object (auto-calculated)',
    example: ['north', 'center']
  })
  radar_detections?: string[];

  @ApiProperty({ required: false, description: 'If true, delete the object', example: false })
  delete?: boolean;
}

