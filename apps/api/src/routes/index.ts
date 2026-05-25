import { FastifyInstance } from 'fastify';
import coursesModule from '../modules/courses/courses.routes';
import trainingRoutes from './training';
import statsRoutes from './stats';
import importExportRoutes from './importExport';
import externalAccountsRoutes from './externalAccounts';
import swaggerRoutes from './swagger';

export default function registerRoutes(app: FastifyInstance): void {
  app.register(coursesModule);
  app.register(trainingRoutes);
  app.register(statsRoutes);
  app.register(importExportRoutes);
  app.register(externalAccountsRoutes);
  app.register(swaggerRoutes);
}
