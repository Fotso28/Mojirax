import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();

    // WsException — expected validation/auth errors
    if (exception instanceof WsException) {
      const error = exception.getError();
      this.logger.warn(`WS validation error: ${JSON.stringify(error)}`);
      const message = typeof error === 'string' ? error : 'Erreur de validation';
      client.emit('error', { message });
      return;
    }

    // Unexpected errors — log and emit generic error to client
    const errMessage = exception instanceof Error ? exception.message : 'Erreur interne';
    this.logger.error(`Unhandled WS exception: ${errMessage}`, exception instanceof Error ? exception.stack : undefined);
    client.emit('error', { message: 'Erreur interne du serveur' });
  }
}
