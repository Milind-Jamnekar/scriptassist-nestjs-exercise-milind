import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskStatus } from './enums/task-status.enum';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private taskQueue: Queue,
    private dataSource: DataSource,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    return await this.dataSource.transaction(async manager => {
      const task = manager.create(Task, createTaskDto);
      const savedTask = await manager.save(task);

      try {
        // Await queue operation and fail fast if needed
        await this.taskQueue.add('task-status-update', {
          taskId: savedTask.id,
          status: savedTask.status,
        });
      } catch (err) {
        this.logger.error(`Failed to queue status update for Task ID ${savedTask.id}`, err);
        throw new InternalServerErrorException('Failed to queue task after creation');
      }

      return savedTask;
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    return await this.dataSource.transaction(async manager => {
      const task = await manager.findOne(Task, {
        where: { id },
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      const originalStatus = task.status;

      // Merge updates into the task
      Object.assign(task, updateTaskDto);

      const updatedTask = await manager.save(Task, task);

      if (originalStatus !== updatedTask.status) {
        try {
          await this.taskQueue.add('task-status-update', {
            taskId: updatedTask.id,
            status: updatedTask.status,
          });
        } catch (err) {
          this.logger.error(`Failed to queue status update for Task ID ${id}`, err);
          throw new InternalServerErrorException('Failed to queue status update');
        }
      }

      return updatedTask;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.tasksRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return result.raw;
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { status },
      relations: ['user'],
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    //Task Status already validated
    await this.tasksRepository.update(id, { status });

    const updatedTask = await this.tasksRepository.findOne({
      where: { id },
    });

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updatedTask;
  }

  async findAllWithFilters(
    page: number,
    limit: number,
    status?: TaskStatus,
    priority?: TaskPriority,
  ): Promise<{ data: Task[]; total: number }> {
    const query = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user');

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    query
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async batchUpdateStatus(taskIds: string[], status: TaskStatus): Promise<number> {
    const result = await this.tasksRepository
      .createQueryBuilder()
      .update(Task)
      .set({ status })
      .whereInIds(taskIds)
      .execute();

    return result.affected || 0;
  }

  async batchDelete(taskIds: string[]): Promise<number> {
    const result = await this.tasksRepository
      .createQueryBuilder()
      .delete()
      .from(Task)
      .whereInIds(taskIds)
      .execute();

    return result.affected || 0;
  }

  async getStats() {
    const result = await this.tasksRepository
      .createQueryBuilder('task')
      .select('COUNT(task.id)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE task.status = :completed)`, 'completed')
      .addSelect(`COUNT(*) FILTER (WHERE task.status = :pending)`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE task.priority = :highPriority)`, 'highPriority')
      .setParameters({
        completed: TaskStatus.COMPLETED,
        pending: TaskStatus.PENDING,
        highPriority: TaskPriority.HIGH,
      })
      .getRawOne();

    return result;
  }
}
