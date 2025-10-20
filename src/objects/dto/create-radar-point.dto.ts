import { ApiProperty } from '@nestjs/swagger';

export class CreateRadarPointDto {
  @ApiProperty({ 
    description: 'Longitude', 
    example: 35.0 
  })
  lng: number;

  @ApiProperty({ 
    description: 'Latitude', 
    example: 32.5 
  })
  lat: number;

  @ApiProperty({ 
    description: 'Altitude in meters', 
    example: 3000 
  })
  alt: number;

  @ApiProperty({ 
    required: false,
    description: 'Optional radar source name', 
    example: 'north' 
  })
  radarSource?: string;

  @ApiProperty({ 
    required: false,
    description: 'Optional parent object ID', 
    example: 'target-123' 
  })
  parentObject?: string;
}

