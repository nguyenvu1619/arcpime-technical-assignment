import 'dotenv/config'
import { Queue, Worker, QueueEvents, type JobsOptions } from 'bullmq'
import { redis as connection } from '@config/redis.js'
import { EventRepository } from '../repositories/event.repository.js'
import { VectorStoreRepository } from './pinecone.service.js'
import { DisclosureRepository } from '../repositories/disclosure.repository.js'

// Redis connection is centralized in @config/redis

export const DISCLOSURE_EVENT_QUEUE = 'disclosure_event'

export const disclosureQueue = new Queue(DISCLOSURE_EVENT_QUEUE, { connection })
export const disclosureQueueEvents = new QueueEvents(DISCLOSURE_EVENT_QUEUE, { connection })

export async function enqueueDisclosureEvent(params: { eventId: string, disclosureId: string }) {
  const opts: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  }
  await disclosureQueue.add('publish', params, opts)
}

export function startDisclosureWorker() {
  const worker = new Worker(
    DISCLOSURE_EVENT_QUEUE,
    async (job: any) => {
      const { eventId, disclosureId } = job.data as { eventId: string, disclosureId: string }
      try {
        // Lock the event row and mark it processing inside a transaction
        await EventRepository.withTransaction(async (transaction) => {
          const locked = await EventRepository.findByIdForUpdate(eventId, transaction)
          if (!locked) {
            throw new Error('event not found')
          }
          await EventRepository.markProcessing(eventId, transaction)
        

        const disclosure = await DisclosureRepository.findById(disclosureId)
        if (!disclosure) {
          await EventRepository.markFailed(eventId)
          return { processed: false, reason: 'disclosure not found' }
        }

        // Upsert disclosure vectors to vector store
        await VectorStoreRepository.upsertDisclosureVectors({
          disclosureId: disclosure.id,
          docketNumber: disclosure.docketNumber,
          title: disclosure.title,
          description: disclosure.description,
          keyDifferences: disclosure.keyDifferences.map(kd => ({
            ordinal: kd.ordinal,
            statementMd: kd.statementMd,
            contrast: kd.contrast ? {
              priorArt: kd.contrast.priorArt,
              ourApproach: kd.contrast.ourApproach,
              whyItMatters: kd.contrast.whyItMatters
            } : {
              priorArt: '',
              ourApproach: '',
              whyItMatters: ''
            },
            evidenceSpans: kd.evidenceSpans.map(es => ({
              page: es.page,
              text: es.text
            })),
            confidence: kd.confidence
          })),
        })

        // Mark event as completed
        await EventRepository.markCompleted(eventId, transaction)
        })
        return { processed: true, disclosureId, eventId }
      } catch (error) {
        // Mark event as failed on any error
        await EventRepository.markFailed(eventId)
        throw error
      }
    },
    { connection }
  )

  worker.on('failed', async (job: any, err: any) => {
    if (job?.data?.eventId) {
      await EventRepository.incrementAttempt(job.data.eventId)
      await EventRepository.markFailed(job.data.eventId)
    }
    console.error('Disclosure worker failed:', err)
  })

  return worker
}
