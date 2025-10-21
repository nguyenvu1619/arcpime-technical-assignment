import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone'

// Prefer env when available; fall back to local dev controller as in current code
const apiKey = process.env.PINECONE_API_KEY || 'pclocal'
const controllerHostUrl = process.env.PINECONE_CONTROLLER_URL || 'http://localhost:5080'

export const pinecone = new Pinecone({
  apiKey,
  controllerHostUrl,
})

export const PINECONE_INDEX = process.env.PINECONE_INDEX || 'disclosures'


