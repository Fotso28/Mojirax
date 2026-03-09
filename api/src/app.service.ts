import { Injectable } from '@nestjs/common';
import { API_VERSION } from './types/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return `Hello World! API Version: ${API_VERSION}`;
  }
}
