import { FastifyInstance } from 'fastify';
import coursesModule from '../modules/courses/courses.routes';
import trainingModule from '../modules/training/training.routes';
import statsModule from '../modules/stats/stats.routes';
import analysisModule from '../modules/analysis/analysis.routes';
import importExportRoutes from './importExport';
import externalAccountsRoutes from './externalAccounts';
import swaggerRoutes from './swagger';

export default function registerRoutes(app: FastifyInstance): void {
  app.register(coursesModule);
  app.register(trainingModule);
  app.register(statsModule);
  app.register(analysisModule);
  app.register(importExportRoutes);
  app.register(externalAccountsRoutes);
  app.register(swaggerRoutes);
}
