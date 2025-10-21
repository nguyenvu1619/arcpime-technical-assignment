import { Router } from "express";
import { DisclosureController } from "../controllers/disclosure.controller.js";

const router = Router();

const disclosureController = new DisclosureController();

// POST /api/disclosures - Create new disclosure
router.post("/", disclosureController.create);

// GET /api/disclosures - Get all disclosures with pagination
router.get("/", disclosureController.findAll);

// GET /api/disclosures/:id - Get disclosure by ID
router.get("/:id", disclosureController.findById);

// GET /api/disclosures/:id/similar - Get similar disclosures
router.get("/:id/similar", disclosureController.findSimilar);

export default router;
