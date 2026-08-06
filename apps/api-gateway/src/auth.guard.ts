import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      // First try standard JWT verification
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      });
      request['user'] = payload;
    } catch {
      try {
        // Fallback: decode Supabase / external JWT payload
        const decoded = this.jwtService.decode(token) as any;
        if (decoded && (decoded.sub || decoded.email)) {
          request['user'] = { sub: decoded.sub || decoded.email, username: decoded.email || decoded.sub };
        } else {
          throw new UnauthorizedException('Invalid token');
        }
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
