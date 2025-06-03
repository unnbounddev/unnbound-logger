import express from 'express';
import axios from 'axios';
import { UnnboundLogger } from '../index';

const logger = new UnnboundLogger();
const app = express();

// Add the trace middleware using the logger's traceMiddleware property
app.use(logger.traceMiddleware);

// Add Axios trace middleware
axios.interceptors.request.use(logger.axiosTraceMiddleware.onFulfilled, logger.axiosTraceMiddleware.onRejected);

// Example route
app.get('/api/example', async (req, res) => {
  // Log with trace ID automatically included
  logger.info('Processing request', { path: req.path });

  try {
    // Make an HTTP request - trace ID will be automatically included
    const response = await axios.get('https://api.example.com/data');

    logger.info('External API call successful', {
      status: response.status,
      data: response.data
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error('External API call failed', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});

console.log('Hello World after app.listen');