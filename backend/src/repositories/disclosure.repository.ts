import Disclosure from '../models/disclosure.model.js'
import type { DisclosureEntity, KeyDifference, Inventor, RawExtraction } from '../domain/entities/disclosure.interface.js'
import { Op, Transaction } from 'sequelize'
import type { WhereOptions } from 'sequelize'
import { BaseRepository } from './base.repository.js'

export type CreateDisclosureData = Pick<DisclosureEntity, 'title' | 'description' | 'keyDifferences' | 'inventors' | 'uri' | 'rawExtraction' | 'publicPlanned' | 'publicVenue' | 'publicDate'>

export type UpdateDisclosureData = Partial<Pick<DisclosureEntity, 'title' | 'description' | 'keyDifferences' | 'inventors' | 'uri' | 'rawExtraction' | 'publicPlanned' | 'publicVenue' | 'publicDate'>>

export class DisclosureRepository extends BaseRepository {
  /**
   * Convert database model to domain entity
   */
  static toDomain(model: Disclosure): DisclosureEntity {
    const data = model.toJSON()
    return {
      id: data.id,
      docketNumber: data.docketNumber,
      title: data.title,
      description: data.description,
      keyDifferences: data.keyDifferences,
      inventors: data.inventors,
      uri: data.uri,
      rawExtraction: data.rawExtraction,
      publicPlanned: data.publicPlanned,
      publicVenue: data.publicVenue,
      publicDate: data.publicDate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  }

  /**
   * Convert domain entity to database persistence format
   */
  static toPersistence(entity: CreateDisclosureData): {
    title: string
    description: string
    keyDifferences: KeyDifference[]
    inventors: Inventor[]
    uri?: string
    rawExtraction?: RawExtraction
    publicPlanned?: boolean
    publicVenue?: string | null
    publicDate?: Date | string | null
  } {
    return {
      title: entity.title,
      description: entity.description,
      keyDifferences: entity.keyDifferences,
      inventors: entity.inventors,
      uri: entity.uri,
      rawExtraction: entity.rawExtraction,
      publicPlanned: entity.publicPlanned,
      publicVenue: entity.publicVenue ?? null,
      publicDate: entity.publicDate ? new Date(entity.publicDate as any) : null,
    }
  }

  /**
   * Create a new disclosure
   */
  static async create(data: CreateDisclosureData, transaction?: Transaction): Promise<DisclosureEntity> {
    const persistenceData = this.toPersistence(data)
    const model = await Disclosure.create(persistenceData, { transaction })
    return this.toDomain(model)
  }

  /**
   * Find disclosure by ID
   */
  static async findById(id: string): Promise<DisclosureEntity | null> {
    const model = await Disclosure.findByPk(id)
    return model ? this.toDomain(model) : null
  }

  /**
   * Find disclosure by docket number
   */
  static async findByDocketNumber(docketNumber: number): Promise<DisclosureEntity | null> {
    const model = await Disclosure.findOne({
      where: { docketNumber: docketNumber }
    })
    return model ? this.toDomain(model) : null
  }

  /**
   * Get all disclosures with pagination, search, filtering, and sorting
   */
  static async findAll(options: {
    limit?: number
    offset?: number
    orderBy?: 'createdAt' | 'updatedAt' | 'docketNumber' | 'title'
    orderDirection?: 'ASC' | 'DESC'
    search?: string
    confidence?: string
    dateRange?: {
      from?: Date
      to?: Date
    }
    publicPlanned?: boolean
  } = {}): Promise<{ rows: DisclosureEntity[]; count: number }> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
      search,
      dateRange,
      publicPlanned
    } = options

    // Build where clause
    const whereClause: WhereOptions<DisclosureEntity> = {}

    // Add search functionality
    if (search) {
      (whereClause as any)[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ]
    }

    // Add date range filter
    if (dateRange?.from || dateRange?.to) {
      const publicDateFilter: any = {}
      if (dateRange.from) {
        publicDateFilter[Op.gte] = dateRange.from
      }
      if (dateRange.to) {
        publicDateFilter[Op.lte] = dateRange.to
      }
      whereClause.publicDate = publicDateFilter
    }


    // Filter by public disclosure planned flag
    if (publicPlanned !== undefined) {
      (whereClause as any).publicPlanned = publicPlanned
    }

    const { rows, count } = await Disclosure.findAndCountAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      limit,
      offset,
      order: [[orderBy, orderDirection]],
    })

    return { 
      rows: rows.map(model => this.toDomain(model)), 
      count 
    }
  }

  /**
   * Update disclosure by ID
   */
  static async updateById(id: string, data: UpdateDisclosureData): Promise<DisclosureEntity | null> {
    const persistenceData = this.toPersistence(data as CreateDisclosureData)
    const [affectedCount] = await Disclosure.update(persistenceData, {
      where: { id }
    })

    if (affectedCount === 0) {
      return null
    }

    const model = await Disclosure.findByPk(id)
    return model ? this.toDomain(model) : null
  }

  /**
   * Delete disclosure by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const affectedCount = await Disclosure.destroy({
      where: { id }
    })

    return affectedCount > 0
  }

  /**
   * Search disclosures by title or description
   */
  static async search(query: string, options: {
    limit?: number
    offset?: number
  } = {}): Promise<{ rows: DisclosureEntity[]; count: number }> {
    const { limit = 50, offset = 0 } = options

    const { rows, count } = await Disclosure.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    })

    return { 
      rows: rows.map(model => this.toDomain(model)), 
      count 
    }
  }

}
