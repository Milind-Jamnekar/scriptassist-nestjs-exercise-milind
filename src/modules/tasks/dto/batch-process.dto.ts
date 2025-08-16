import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TaskBatchProcess } from '../enums/task-batch-process.enum';

export class BatchProcessDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tasks: string[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(TaskBatchProcess, { message: 'Invalid task batch process action' })
  action: TaskBatchProcess;
}
