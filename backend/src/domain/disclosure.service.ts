import { DisclosureRepository } from '../repositories/disclosure.repository.js'
import { EventRepository } from '../repositories/event.repository.js'
import { VectorStoreRepository } from '../services/pinecone.service.js'
import { enqueueDisclosureEvent } from '../services/queue.js'
import type { KeyDifference, Inventor, RawExtraction } from './entities/disclosure.interface.js'

export class DisclosureService {
  private readonly disclosureRepository: typeof DisclosureRepository
  private readonly vectorStore: typeof VectorStoreRepository
  private readonly eventRepository: typeof EventRepository

  constructor(params: {
    disclosureRepository: typeof DisclosureRepository
    vectorStore: typeof VectorStoreRepository
    eventRepository: typeof EventRepository
  }) {
    this.disclosureRepository = params.disclosureRepository
    this.vectorStore = params.vectorStore
    this.eventRepository = params.eventRepository
  }

  async createDisclosure(input: {
    title: string
    description: string
    keyDifferences: KeyDifference[]
    inventors: Inventor[]
    uri?: string
    rawExtraction?: RawExtraction
    publicPlanned?: boolean
    publicVenue?: string | null
    publicDate?: string | Date | null
  }) {
    return await this.disclosureRepository.withTransaction(async (transaction) => {
      const disclosure = await this.disclosureRepository.create({
        title: input.title,
        description: input.description,
        keyDifferences: input.keyDifferences,
        inventors: input.inventors,
        uri: input.uri,
        rawExtraction: input.rawExtraction,
        publicPlanned: input.publicPlanned,
        publicVenue: input.publicVenue ?? null,
        publicDate: input.publicDate ?? null,
      }, transaction)

      // Outbox event
      const event = await this.eventRepository.create({
        topic: 'disclosure_event',
        name: 'disclosure_created',
        key: disclosure.id,
        payload: {
          disclosure_id: disclosure.id,
          docket_number: disclosure.docketNumber,
          title: disclosure.title,
        },
      }, transaction)
      await enqueueDisclosureEvent({
        eventId: event.id,
        disclosureId: disclosure.id,
    })

      return disclosure
    })
  }

  async findAll(options: {
    limit?: number
    offset?: number
    orderBy?: 'createdAt' | 'updatedAt' | 'docketNumber' | 'title'
    orderDirection?: 'ASC' | 'DESC'
    search?: string
    dateRange?: {
      from?: Date
      to?: Date
    }
  }) {
    return await this.disclosureRepository.findAll(options)
  }

  async findById(id: string) {
    return await this.disclosureRepository.findById(id)
  }

  async findSimilar(id: string, topK: number = 3) {
    const disclosure = await this.disclosureRepository.findById(id)
    
    if (!disclosure) {
      return null
    }

    // Query vector store for similar disclosures
    const similarResults = await this.vectorStore.querySimilar({
      title: disclosure.title,
      description: disclosure.description,
      keyDifferences: (disclosure.keyDifferences || []).map(kd => ({
        ordinal: kd.ordinal,
        statementMd: kd.statementMd
      })),
      topK: topK * 4
    })

    // Extract unique disclosure IDs from the results
    const disclosureIds = [...new Set(
      similarResults
        .map(result => result.metadata?.disclosure_id)
        .filter(Boolean)
    )]

    // Fetch the actual disclosure records
    const similarDisclosures = []
    for (const disclosureId of disclosureIds) {
      if (disclosureId !== id) { // Exclude the current disclosure
        const similarDisclosure = await this.disclosureRepository.findById(disclosureId)
        if (similarDisclosure) {
          // Find the best match score for this disclosure
          const bestMatch = similarResults.find(
            result => result.metadata?.disclosure_id === disclosureId
          )
          similarDisclosures.push({
            ...similarDisclosure,
            similarityScore: bestMatch?.score || 0
          })
        }
      }
    }

    // Sort by similarity score and limit to topK
    similarDisclosures.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
    return similarDisclosures.slice(0, topK)
  }
}


