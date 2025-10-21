import { Router } from "express";
import { FileController } from "../controllers/file.controller.js";

const router = Router();

router.post("/signed-url", FileController.getSignedUrl);

router.post("/view-url", FileController.getSignedViewUrl);

router.post("/extract", FileController.extractInventionData);

export default router;
