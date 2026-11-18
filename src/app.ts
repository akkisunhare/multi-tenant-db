import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';

// Middlewares
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

// Route Handlers
import superAdminRoutes from './modules/superadmin/superadmin.routes';
import masterRoutes from './modules/master/master.routes';
import masterUserRoutes from './modules/masterUser/masterUser.routes';
import authRoutes from './modules/auth/auth.routes';
import dataRoutes from './modules/data/data.routes';
import menuRoutes from './modules/menu/menu.routes';

const app: Application = express();

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (disabled during tests)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global Rate Limiting for Login & Auth endpoints
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Multi-Tenant Backend Service is healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Apply rate limiting to login endpoints
app.use('/superadmin/login', authLimiter);
app.use('/master/login', authLimiter);
app.use('/auth/login', authLimiter);
app.use('/master/user/login', authLimiter);

// API Route Mounts
app.use('/superadmin', superAdminRoutes);
app.use('/auth', authRoutes);
app.use('/master/user', masterUserRoutes);
app.use('/master/menu', menuRoutes);
app.use('/master', masterRoutes);
app.use('/data', dataRoutes);

// 404 Handler
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

export default app;
