import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SafeHttpExceptionFilter } from './http-exception.filter';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: SafeHttpExceptionFilter,
    },
  ],
})
export class ObservabilityModule {}
