import 'dotenv/config'
import { pinecone, PINECONE_INDEX as INDEX_NAME } from '@config/pinecone.js'
import type { KeyDifference } from './openai.service.js'
import { OpenAIService } from './openai.service.js'

// Pinecone client and index name are centralized in @config/pinecone

export class VectorStoreRepository {
  private static isInitialized = false
  private static initializationPromise: Promise<void> | null = null

  static async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // Start initialization
    this.initializationPromise = this._performInitialization()
    
    try {
      await this.initializationPromise
      this.isInitialized = true
    } catch (error) {
      this.initializationPromise = null
      throw error
    }
  }

  private static async _performInitialization(): Promise<void> {
    try {
      // Check if index exists
      const existingIndexes = await pinecone.listIndexes()
      const indexExists = existingIndexes.indexes?.some(index => index.name === INDEX_NAME)
      
      if (indexExists) {
        console.log(`Index '${INDEX_NAME}' already exists`)
        return
      }
      
      // Create the index if it doesn't exist
      console.log(`Creating index '${INDEX_NAME}'...`)
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: 1536, // OpenAI embedding dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      })
      
      console.log(`Index '${INDEX_NAME}' created successfully!`)
      
      // Wait for index to be ready
      console.log('Waiting for index to be ready...')
      let isReady = false
      let attempts = 0
      const maxAttempts = 30
      
      while (!isReady && attempts < maxAttempts) {
        try {
          const indexDescription = await pinecone.describeIndex(INDEX_NAME)
          isReady = indexDescription.status?.ready === true
          if (!isReady) {
            console.log(`Index not ready yet, waiting... (attempt ${attempts + 1}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            attempts++
          }
        } catch (error) {
          console.log(`Error checking index status: ${error}`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          attempts++
        }
      }
      
      if (isReady) {
        console.log('Index is ready for use!')
      } else {
        console.log('Index creation timed out, but it may still be initializing in the background')
      }
      
    } catch (error) {
      console.error('Error initializing Pinecone:', error)
      throw error
    }
  }

  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  static async upsertDisclosureVectors(params: {
    disclosureId: string
    docketNumber: number
    title: string
    description: string
    keyDifferences: KeyDifference[]
  }): Promise<void> {
    const { disclosureId, docketNumber, title, description, keyDifferences } = params

    // Ensure Pinecone is initialized before using it
    await this.ensureInitialized()
    
    const indexHost = (await pinecone.describeIndex(INDEX_NAME)).host
    const index = pinecone.index(INDEX_NAME, 'http://' + indexHost)

    // Build content pieces to embed
    const items: Array<{ id: string; text: string; metadata: Record<string, any> }> = []

    items.push({
      id: `${disclosureId}:title`,
      text: title,
      metadata: { type: 'title', disclosure_id: disclosureId, docket_number: docketNumber }
    })

    items.push({
      id: `${disclosureId}:description`,
      text: description,
      metadata: { type: 'description', disclosure_id: disclosureId, docket_number: docketNumber }
    })

    for (const kd of keyDifferences) {
      const id = `${disclosureId}:kd:${kd.ordinal}`
      const text = kd.statementMd
      items.push({
        id,
        text,
        metadata: {
          type: 'key_difference',
          disclosure_id: disclosureId,
          docket_number: docketNumber,
          ordinal: kd.ordinal
        }
      })
    }

    // Generate embeddings in batch (sequentially for now)
    const vectors = [] as Array<{ id: string; values: number[]; metadata: Record<string, any> }>

    for (const item of items) {
      const embedding = await OpenAIService.embedText(item.text)
      if (embedding.length > 0) {
        vectors.push({ id: item.id, values: embedding, metadata: item.metadata })
      }
    }

    if (vectors.length > 0) {
      await index.upsert(vectors)
    }
  }

  static async querySimilar(params: {
    title: string
    description: string
    keyDifferences: Array<{ ordinal: number; statementMd: string }>
    topK?: number
  }): Promise<Array<{ id: string; score?: number; metadata?: Record<string, any> }>> {
    const { title, description, keyDifferences, topK = 5 } = params
    const combined = [title, description, keyDifferences].filter(Boolean).join('\n')
    const vector = await OpenAIService.embedText(combined)
    console.log(vector, params)
    if (!vector.length) return []

    // Ensure Pinecone is initialized before using it
    await this.ensureInitialized()
    
    const indexHost = (await pinecone.describeIndex(INDEX_NAME)).host
    const index = pinecone.index(INDEX_NAME, 'http://' + indexHost)
    const result = await index.query({
      vector,
      topK,
      includeMetadata: true,
    } as any)
    const matches = (result.matches || []).map((m: any) => ({ id: m.id as string, score: m.score as number | undefined, metadata: m.metadata as Record<string, any> | undefined }))
    return matches
  }
}
