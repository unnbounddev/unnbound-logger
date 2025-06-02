import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { traceContext } from './trace-context';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const traceId = req.header('x-trace-id') || uuidv4();

  // Set the trace ID in the response headers
  res.setHeader('x-trace-id', traceId);

  // Run the request handler in the trace context
  traceContext.run(traceId, () => {
    next();
  });
};