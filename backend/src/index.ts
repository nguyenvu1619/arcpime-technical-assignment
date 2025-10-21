import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import apiRoutes from "./routes/index.js";
import { startDisclosureWorker } from "./services/queue.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync();
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.json({ 
    message: "PDF Storage API", 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});


app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({
    error: "Internal server error",
    message: error?.message || "Unknown error"
  });
});

async function startServer() {
  await initializeDatabase();
  
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`S3 Bucket: ${process.env.S3_BUCKET_NAME || 'Not configured'}`);
    console.log(`Database: ${process.env.DB_NAME || 'arcprime'}`);
  });

  startDisclosureWorker();
}

startServer().catch(console.error);