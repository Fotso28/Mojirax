import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { API_VERSION } from '@co-founder/types';

describe('AppService - Monorepo Integration', () => {
    let service: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = module.get<AppService>(AppService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should use shared types from @co-founder/types', () => {
        const result = service.getHello();
        expect(result).toContain(API_VERSION);
        expect(result).toBe(`Hello World! API Version: ${API_VERSION}`);
    });

    it('should verify API_VERSION is imported correctly', () => {
        expect(API_VERSION).toBeDefined();
        expect(typeof API_VERSION).toBe('string');
        expect(API_VERSION).toBe('v1');
    });
});
