import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const user = client.data?.user;

    if (!user?.uid || !user?.userId) {
      this.logger.warn('WebSocket access denied: missing user data');
      throw new WsException('Non authentifié');
    }

    return true;
  }
}
