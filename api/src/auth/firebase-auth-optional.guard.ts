import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard optionnel Firebase : si le token est présent et valide, req.user est peuplé.
 * Si pas de token ou token invalide, la requête continue sans req.user (pas d'erreur 401).
 */
@Injectable()
export class FirebaseAuthOptionalGuard extends AuthGuard('firebase-jwt') {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;

        // Pas de header Authorization → continuer sans auth
        if (!authHeader) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any) {
        // Si erreur ou pas d'user, continuer sans auth (pas de throw)
        if (err || !user) {
            return null;
        }
        return user;
    }
}
