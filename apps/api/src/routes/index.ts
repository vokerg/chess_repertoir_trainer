import { FastifyInstance } from 'fastify';
import coursesModule from '../modules/courses/courses.routes';
import trainingModule from '../modules/training/training.routes';
import trainingMarathonsModule from '../modules/training-marathons/training-marathons.routes';
import statsModule from '../modules/stats/stats.routes';
import analysisModule from '../modules/analysis/analysis.routes';
import importedGamesModule from '../modules/imported-games/imported-games.routes';
import labModule from '../modules/lab/lab.routes';
import importExportRoutes from './importExport';
import externalAccountsRoutes from './externalAccounts';
import swaggerRoutes from './swagger';
import repertoireCoverageModule from '../modules/repertoire-coverage/repertoire-coverage.routes';
import mcpModule from '../modules/mcp/mcp.routes';

export default function registerRoutes(app: FastifyInstance): void {
  app.register(coursesModule);
  app.register(trainingModule);
  app.register(trainingMarathonsModule);
  app.register(statsModule);
  app.register(analysisModule);
  app.register(importedGamesModule);
  app.register(labModule);
  app.register(repertoireCoverageModule);
  app.register(mcpModule);
  app.register(importExportRoutes);
  app.register(externalAccountsRoutes);
  app.register(swaggerRoutes);
}
