// Order Service Entry Point
import express from 'express';
import { config } from './config';

const app = express();

app.use(express.json());

const PORT = config.port || 3002;

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});