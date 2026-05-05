import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VerificationsModule } from './verifications/verifications.module';
import { ArticlesModule } from './articles/articles.module';
import { SpotsModule } from './spots/spots.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TripsModule } from './trips/trips.module';
import { SearchModule } from './search/search.module';
import { FeedModule } from './feed/feed.module';
import { LightDiariesModule } from './light-diaries/light-diaries.module';
import { CollectionsModule } from './collections/collections.module';
import { CrisisModule } from './crisis/crisis.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ModerationModule } from './moderation/moderation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { JobsModule } from './jobs/jobs.module';

/**
 * AppModule — Locore Backend のルートモジュール。
 * モジュール一覧は ARCHITECTURE.md §3.2 に対応。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    UsersModule,
    VerificationsModule,
    ArticlesModule,
    SpotsModule,
    PurchasesModule,
    ReviewsModule,
    TripsModule,
    SearchModule,
    FeedModule,
    LightDiariesModule,
    CollectionsModule,
    CrisisModule,
    PayoutsModule,
    NotificationsModule,
    ModerationModule,
    AnalyticsModule,
    JobsModule,
  ],
})
export class AppModule {}
