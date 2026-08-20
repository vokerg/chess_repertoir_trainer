import { FastifyInstance } from 'fastify';
import coursesModule from '../modules/courses/courses.routes';
import builderCourseReintegrationModule from '../modules/courses/builder-course-reintegration.routes';
import trainingModule from '../modules/training/training.routes';
import trainingMarathonsModule from '../modules/training-marathons/training-marathons.routes';
import statsModule from '../modules/stats/stats.routes';
import analysisModule from '../modules/analysis/analysis.routes';
import candidateDecisionModule from '../modules/candidate-decision/candidate-decision.routes';
import importedGamesModule from '../modules/imported-games/imported-games.routes';
import openingAnalysisBreakdownsModule from '../modules/imported-games/opening-analysis-breakdowns.routes';
import openingStrugglesModule from '../modules/opening-struggles/opening-struggles.routes';
import labModule from '../modules/lab/lab.routes';
import jobsModule from '../modules/jobs/job-run.routes';
import accountImportModule from '../modules/account-imports/account-import.routes';
import adminModule, { type AdminModuleOptions } from '../modules/admin/admin.routes';
import externalAccountsRoutes from './externalAccounts';
import lichessAuthRoutes from './lichessAuth';
import repertoireCoverageModule from '../modules/repertoire-coverage/repertoire-coverage.routes';
import mcpModule from '../modules/mcp/mcp.routes';
import boardImagesModule from '../modules/board-images/board-images.routes';
import scenarioTrainingModule from '../modules/scenario-training/scenario-training.routes';
import lichessPuzzlesModule from '../modules/lichess-puzzles/lichess-puzzles.routes';
import mobileSyncModule from '../modules/mobile-sync/mobile-sync.routes';
import openingExplorerModule from '../modules/opening-explorer/opening-explorer.routes';
import playerChessProfileModule from '../modules/player-chess-profile/player-chess-profile.routes';
import aiModule from '../modules/ai/ai.routes';
import ratingNormalizationModule from '../modules/rating-normalization/rating-normalization.routes';
import activityFeedModule from '../modules/activity-feed/activity-feed.routes';
import onboardingModule from '../modules/onboarding/onboarding.routes';

export interface RegisterRoutesOptions {
  admin: AdminModuleOptions;
}

export default function registerRoutes(app: FastifyInstance, options: RegisterRoutesOptions): void {
  app.register(coursesModule);
  app.register(builderCourseReintegrationModule);
  app.register(trainingModule);
  app.register(trainingMarathonsModule);
  app.register(statsModule);
  app.register(analysisModule);
  app.register(candidateDecisionModule);
  app.register(importedGamesModule);
  app.register(openingAnalysisBreakdownsModule);
  app.register(openingStrugglesModule);
  app.register(labModule);
  app.register(jobsModule);
  app.register(accountImportModule);
  app.register(adminModule, options.admin);
  app.register(repertoireCoverageModule);
  app.register(mcpModule);
  app.register(boardImagesModule);
  app.register(scenarioTrainingModule);
  app.register(lichessPuzzlesModule);
  app.register(mobileSyncModule);
  app.register(openingExplorerModule);
  app.register(playerChessProfileModule);
  app.register(aiModule);
  app.register(ratingNormalizationModule);
  app.register(activityFeedModule);
  app.register(onboardingModule);
  app.register(lichessAuthRoutes);
  app.register(externalAccountsRoutes);
}
