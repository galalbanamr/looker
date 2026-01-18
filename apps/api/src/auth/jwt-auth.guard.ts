import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.cookies?.token || this.extractBearerToken(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token);
            // Normalize payload: ensure userId exists (map from sub if needed)
            if (!payload.userId && payload.sub) {
                payload.userId = payload.sub;
            }

            console.log('[JwtAuthGuard] Authenticated user:', payload.userId);
            (request as any).user = payload;
            return true;
        } catch (err: any) {
            console.error('[JwtAuthGuard] Token verification failed:', err.message);
            throw new UnauthorizedException('Invalid token');
        }
    }

    private extractBearerToken(request: Request): string | undefined {
        const auth = request.headers.authorization;
        return auth?.startsWith('Bearer ') ? auth.substring(7) : undefined;
    }
}
