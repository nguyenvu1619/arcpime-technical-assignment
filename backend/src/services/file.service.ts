import 'dotenv/config'
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME as BUCKET_NAME } from '@config/aws.js'

if (!BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME is not set in backend/.env')
}

export class FileService {
  /**
   * Generate a presigned URL for uploading a PDF file to S3
   * @param fileName - The name of the file to upload
   * @param contentType - The MIME type of the file (should be 'application/pdf')
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Promise<string> - The presigned URL
   */
  static async getSignedUploadUrl(
    fileName: string,
    contentType: string = 'application/pdf',
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Validate file type
      if (contentType !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      // Generate a unique key for the file
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `pdfs/${timestamp}_${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL for upload');
    }
  }

  /**
   * Generate a presigned URL for downloading a PDF file from S3
   * @param key - The S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Promise<string> - The presigned URL
   */
  static async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      
      return signedUrl;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error('Failed to generate signed URL for download');
    }
  }

  /**
   * Upload a file directly to S3 (alternative to presigned URL)
   * @param file - The file buffer
   * @param fileName - The name of the file
   * @param contentType - The MIME type of the file
   * @returns Promise<string> - The S3 object key
   */
  static async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string = 'application/pdf'
  ): Promise<string> {
    try {
      // Validate file type
      if (contentType !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      // Generate a unique key for the file
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `pdfs/${timestamp}_${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);
      
      return key;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Fetch object bytes from S3
   */
  static async getObjectBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3Client.send(command);
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Try to find the most recent key matching a file name in the `pdfs/` prefix.
   */
  static async findKeyByFileName(fileName: string): Promise<string | null> {
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const list = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: 'pdfs/' }));
    const candidates = (list.Contents || [])
      .filter((o) => o.Key && o.Key.endsWith(`_${sanitized}`))
      .sort((a, b) => (new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime()));
    return candidates[0]?.Key || null;
  }
}
