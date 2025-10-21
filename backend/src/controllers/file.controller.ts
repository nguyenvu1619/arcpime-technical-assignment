import type { Request, Response } from "express";
import { FileService } from "../services/file.service.js";
import { OpenAIService } from "../services/openai.service.js";
import { PDFParse } from "pdf-parse";

export class FileController {
  /**
   * Generate a signed URL for PDF upload to S3
   */
  static async getSignedUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType = 'application/pdf' } = req.body;

      if (!fileName) {
        res.status(400).json({
          error: "fileName is required"
        });
        return;
      }

      const signedUrl = await FileService.getSignedUploadUrl(fileName, contentType);
      
      res.json({
        success: true,
        signedUrl,
        message: "Signed URL generated successfully"
      });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.status(500).json({
        error: "Failed to generate signed URL",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Generate a signed URL for viewing/downloading a PDF from S3
   */
  static async getSignedViewUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, expiresIn = 3600 } = req.body;

      if (!fileName) {
        res.status(400).json({ 
          error: "BadRequest", 
          message: "Missing FileName" 
        });
        return;
      }
      const signedUrl = await FileService.getSignedDownloadUrl(fileName, parseInt(expiresIn as string));
      
      res.json({
        success: true,
        signedUrl,
        message: "Signed view URL generated successfully"
      });
    } catch (error) {
      console.error("Error generating signed view URL:", error);
      res.status(500).json({
        error: "Failed to generate signed view URL",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Extract structured invention data from a PDF stored in S3 using OpenAI
   * Accepts either { key } or { fileName }
   */
  static async extractInventionData(req: Request, res: Response): Promise<void> {
    try {
      const { key, fileName } = req.body || {};
      let targetKey = key as string | undefined;

      if (!targetKey && fileName) {
        const found = await FileService.findKeyByFileName(fileName);
        if (!found) {
          res.status(404).json({ error: "NotFound", message: "No matching PDF found in S3" });
          return;
        }
        targetKey = found;
      }

      if (!targetKey) {
        res.status(400).json({ error: "BadRequest", message: "Provide 'key' or 'fileName'" });
        return;
      }

      const bytes = await FileService.getObjectBuffer(targetKey);
      const parser = new PDFParse( { data: bytes })
      const parsed = await parser.getText();
      const pdfText = parsed.text || "";
      
      const invention = await OpenAIService.extractInvention(pdfText);
      
      // Check if the document is relevant for patent disclosure
      if (!invention.isRelevant) {
        res.status(400).json({ 
          error: "DocumentNotRelevant", 
          message: "This document is not relevant for patent disclosure analysis",
        });
        return;
      }
      
      res.json({ 
        success: true, 
        key: targetKey,
        invention,
        raw_text: pdfText // optional: include raw text for debugging
      });
    } catch (error: any) {
      console.error("/api/pdf/extract error", error);
      res.status(500).json({ error: "ExtractFailed", message: error?.message || "Unknown error" });
    }
  }
}
