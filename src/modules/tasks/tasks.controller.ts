import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { BatchProcessDto } from './dto/batch-process.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskBatchProcess } from './enums/task-batch-process.enum';
import { TaskStatus } from './enums/task-status.enum';
import { TasksService } from './tasks.service';

// This guard needs to be implemented or imported from the correct location
// We're intentionally leaving it as a non-working placeholder
class JwtAuthGuard {}

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ limit: 100, windowMs: 60000 })
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all tasks with optional filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
  })
  @ApiQuery({
    name: 'priority',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  async findAll(@Query() query: TaskQueryDto) {
    const { status, priority, page, limit } = query;

    const { data, total } = await this.tasksService.findAllWithFilters(
      page,
      limit,
      status,
      priority,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats() {
    return this.tasksService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a task by ID' })
  async findOne(@Param('id') params: string) {
    return this.tasksService.findOne(params);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') params: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(params, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @HttpCode(204)
  async remove(@Param('id') params: string): Promise<void> {
    await this.tasksService.remove(params);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  async batchProcess(@Body() operations: BatchProcessDto) {
    const { tasks: taskIds, action } = operations;

    let affected = 0;

    switch (action) {
      case TaskBatchProcess.Complete:
        affected = await this.tasksService.batchUpdateStatus(taskIds, TaskStatus.COMPLETED);
        break;
      case TaskBatchProcess.Delete:
        affected = await this.tasksService.batchDelete(taskIds);
        break;
    }

    return {
      message: `${action} operation completed`,
      affected,
    };
  }
}
