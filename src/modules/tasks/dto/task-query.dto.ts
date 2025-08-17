import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class TaskQueryDto {
  @ApiProperty({ required: false, enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  status?: TaskStatus;

  @ApiProperty({ required: false, enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Invalid task priority' })
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, example: '2025-08-16T12:26:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, example: '2025-08-16T12:26:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  userId?: string;
}
