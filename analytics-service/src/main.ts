import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3011;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics-service', port: PORT });
});

app.post('/api/v1/events', (req, res) => {
  res.json({ message: 'Event tracking endpoint' });
});

app.get('/api/v1/metrics', (req, res) => {
  res.json({ message: 'Business metrics endpoint' });
});

app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});