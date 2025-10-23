import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipCsrf = this.reflector.getAllAndOverride<boolean>("skipCsrf", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Skip CSRF check for GET requests
    if (method === "GET") {
      return true;
    }

    const csrfToken = request.headers["x-csrf-token"] || request.body?._csrf;
    const sessionCsrfToken = request.session?.csrfToken;

    if (!csrfToken || !sessionCsrfToken || csrfToken !== sessionCsrfToken) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
