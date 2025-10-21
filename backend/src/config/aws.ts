import 'dotenv/config'
import { S3Client } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION || 'us-east-1'
const hasStaticCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
const credentials = hasStaticCreds
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    }
  : undefined

export const s3Client = new S3Client({ region, credentials })
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || ''


