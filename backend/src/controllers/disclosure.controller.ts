import type { Request, Response } from "express";
import { DisclosureRepository } from "../repositories/disclosure.repository.js";
import { EventRepository } from "../repositories/event.repository.js";
import { DisclosureService } from "../domain/disclosure.service.js";
import { VectorStoreRepository } from "../services/pinecone.service.js";

export class DisclosureController {
    private readonly disclosureService: DisclosureService = new DisclosureService({
        disclosureRepository: DisclosureRepository,
        vectorStore: VectorStoreRepository,
        eventRepository: EventRepository,
      })
  /**
   * Create a new disclosure
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        title, 
        description, 
        keyDifferences, 
        inventors, 
        uri,
        rawExtraction,
        publicPlanned,
        publicVenue,
        publicDate,
      } = req.body;

      if (!title || !description || !keyDifferences || !inventors) {
        res.status(400).json({
          error: "Missing required fields",
          message: "title, description, keyDifferences, and inventors are required"
        });
        return;
      }


      const disclosure = await this.disclosureService.createDisclosure({
        title,
        description,
        keyDifferences,
        inventors,
        uri,
        rawExtraction,
        publicPlanned,
        publicVenue,
        publicDate,
      })

      res.status(201).json({
        success: true,
        disclosure,
        message: "Disclosure created successfully"
      });

    } catch (error: any) {
      console.error("Error creating disclosure:", error);
      res.status(500).json({
        error: "Failed to create disclosure",
        message: error?.message || "Unknown error"
      });
    }
  }

  /**
   * Get all disclosures with pagination, search, filtering, and sorting
   */
   findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        orderBy = 'createdAt', 
        orderDirection = 'DESC',
        search,
        dateFrom,
        dateTo,
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: orderBy as any,
        orderDirection: orderDirection as any
      };

      if (search) {
        options.search = search as string;
      }

      if (dateFrom || dateTo) {
        options.dateRange = {
          from: dateFrom ? new Date(dateFrom as string) : undefined,
          to: dateTo ? new Date(dateTo as string) : undefined
        };
      }

      const result = await this.disclosureService.findAll({
        ...options,
        ...(req.query.publicPlanned !== undefined && { publicPlanned: (req.query.publicPlanned as string) === 'true' })
      });
      res.json({
        success: true,
        disclosures: result.rows,
        total: result.count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error("Error fetching disclosures:", error);
      res.status(500).json({
        error: "Failed to fetch disclosures",
        message: error?.message || "Unknown error"
      });
    }
  }

  /**
   * Get disclosure by ID
   */
   findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const disclosure = await this.disclosureService.findById(id);

      if (!disclosure) {
        res.status(404).json({
          error: "NotFound",
          message: "Disclosure not found"
        });
        return;
      }

      res.json({
        success: true,
        disclosure
      });
    } catch (error: any) {
      console.error("Error fetching disclosure:", error);
      res.status(500).json({
        error: "Failed to fetch disclosure",
        message: error?.message || "Unknown error"
      });
    }
  }

  /**
   * Get similar disclosures using vector similarity
   */
   findSimilar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { topK = 3 } = req.query;
      
      const similarDisclosures = await this.disclosureService.findSimilar(id, parseInt(topK as string));

      if (similarDisclosures === null) {
        res.status(404).json({
          error: "NotFound",
          message: "Disclosure not found"
        });
        return;
      }

      res.json({
        success: true,
        similarDisclosures
      });
    } catch (error: any) {
      console.error("Error fetching similar disclosures:", error);
      res.status(500).json({
        error: "Failed to fetch similar disclosures",
        message: error?.message || "Unknown error"
      });
    }
  }
}
