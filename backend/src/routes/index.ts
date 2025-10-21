import { Router } from "express";
import fileRoutes from "./file.routes.js";
import disclosureRoutes from "./disclosure.routes.js";

const router = Router();

// Mount route modules
router.use("/files", fileRoutes);
router.use("/disclosures", disclosureRoutes);

export default router;
