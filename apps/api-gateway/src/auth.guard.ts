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
      // First try standard internal JWT verification (for demo/mock purposes)
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      });
      request['user'] = payload;
    } catch {
      try {
        // Fallback: Verify Supabase JWT payload using SUPABASE_JWT_SECRET
        if (!process.env.SUPABASE_JWT_SECRET) {
          console.warn('SUPABASE_JWT_SECRET is not set, falling back to insecure decode. Please configure your .env');
          const decoded = this.jwtService.decode(token) as any;
          if (decoded && (decoded.sub || decoded.email)) {
            request['user'] = { sub: decoded.sub || decoded.email, username: decoded.email || decoded.sub };
            return true;
          }
          throw new UnauthorizedException('Invalid token');
        }

        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.SUPABASE_JWT_SECRET,
        });
        
        if (payload && (payload.sub || payload.email)) {
          request['user'] = { sub: payload.sub || payload.email, username: payload.email || payload.sub };
        } else {
          throw new UnauthorizedException('Invalid Supabase token payload');
        }
      } catch (err) {
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
