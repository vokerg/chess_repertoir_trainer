import { FastifyInstance } from 'fastify';
import coursesRoutes from './courses';
import chaptersRoutes from './chapters';
import linesRoutes from './lines';
import nodesRoutes from './nodes';
import trainingRoutes from './training';
import statsRoutes from './stats';
import importExportRoutes from './importExport';

export default function registerRoutes(app: FastifyInstance): void {
  app.register(coursesRoutes, { prefix: '/api/courses' });
  app.register(chaptersRoutes);
  app.register(linesRoutes);
  app.register(nodesRoutes);
  app.register(trainingRoutes);
  app.register(statsRoutes);
  app.register(importExportRoutes);
}