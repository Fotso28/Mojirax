import { Injectable } from '@nestjs/common';
import { API_VERSION } from '@co-founder/types';

@Injectable()
export class AppService {
  getHello(): string {
    return `Hello World! API Version: ${API_VERSION}`;
  }
}
