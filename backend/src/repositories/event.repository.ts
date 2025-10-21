import Event from '../models/event.model.js'
import type { EventEntity } from '../domain/entities/event.interface.js'
import { Transaction } from 'sequelize'
import { BaseRepository } from './base.repository.js'

export interface CreateEventData {
  topic: string
  name: string
  key: string
  payload: Record<string, unknown>
}

export class EventRepository extends BaseRepository {
  /**
   * Convert database model to domain entity
   */
  static toDomain(model: Event): EventEntity {
    const data = model.toJSON()
    return {
      id: data.id,
      topic: data.topic,
      name: data.name,
      key: data.key,
      payload: data.payload,
      status: data.status,
      attemptCount: data.attempt_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Convert domain entity to database persistence format
   */
  static toPersistence(entity: CreateEventData): {
    topic: string
    name: string
    key: string
    payload: Record<string, unknown>
  } {
    return {
      topic: entity.topic,
      name: entity.name,
      key: entity.key,
      payload: entity.payload,
    }
  }

  static async create(data: CreateEventData, transaction?: Transaction): Promise<EventEntity> {
    const persistenceData = this.toPersistence(data)
    const model = await Event.create(persistenceData, { transaction })
    return this.toDomain(model)
  }

  static async findPending(limit = 100): Promise<EventEntity[]> {
    const models = await Event.findAll({ 
      where: { status: 'pending' }, 
      limit, 
      order: [['created_at', 'ASC']] 
    })
    return models.map(model => this.toDomain(model))
  }

  static async markCompleted(id: string, transaction?: Transaction): Promise<void> {
    await Event.update({ status: 'completed' }, { where: { id }, transaction })
  }

  static async markFailed(id: string): Promise<void> {
    await Event.update({ status: 'failed' }, { where: { id } })
  }

  static async incrementAttempt(id: string): Promise<void> {
    await Event.increment('attempt_count', { by: 1, where: { id } })
  }

  static async markProcessing(id: string, transaction?: Transaction): Promise<void> {
    await Event.update({ status: 'processing' }, { where: { id }, transaction })
  }

  /**
   * Find the next pending event with a row-level lock so multiple workers
   * can safely claim work without conflicts. Uses FOR UPDATE SKIP LOCKED.
   */
  static async findNextPendingWithLock(transaction: Transaction): Promise<EventEntity | null> {
    const model = await Event.findOne({
      where: { status: 'pending' },
      order: [['created_at', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true
    })

    if (!model) return null

    await model.update({ status: 'processing' }, { transaction })
    return this.toDomain(model)
  }

  /**
   * Find a specific event by id and acquire a row lock within the given transaction.
   */
  static async findByIdForUpdate(id: string, transaction: Transaction): Promise<EventEntity | null> {
    const model = await Event.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true
    })

    return model ? this.toDomain(model) : null
  }
}
