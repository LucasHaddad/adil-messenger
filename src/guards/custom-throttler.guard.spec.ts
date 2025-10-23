import { Test, TestingModule } from "@nestjs/testing";
import { CustomThrottlerGuard } from "@/guards/custom-throttler.guard";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

describe("CustomThrottlerGuard", () => {
  let guard: CustomThrottlerGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: "default",
            ttl: 60 * 1000,
            limit: 10,
          },
        ]),
      ],
      providers: [CustomThrottlerGuard],
    }).compile();

    guard = module.get<CustomThrottlerGuard>(CustomThrottlerGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("getTracker", () => {
    it("should return user-based tracker for authenticated users", async () => {
      const req = {
        user: { sub: "user-123", id: "user-123" },
        ip: "127.0.0.1",
      };

      const tracker = await guard["getTracker"](req);
      expect(tracker).toBe("user-user-123");
    });

    it("should return IP-based tracker for unauthenticated users", async () => {
      const req = {
        ip: "127.0.0.1",
      };

      const tracker = await guard["getTracker"](req);
      expect(tracker).toBe("127.0.0.1");
    });

    it("should handle user with id field instead of sub", async () => {
      const req = {
        user: { id: "user-456" },
        ip: "127.0.0.1",
      };

      const tracker = await guard["getTracker"](req);
      expect(tracker).toBe("user-user-456");
    });
  });

  describe("generateKey", () => {
    it("should generate auth key for auth routes", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/auth/login" },
            url: "/auth/login",
            method: "POST",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-auth-user-123");
    });

    it("should generate search key for search routes", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/search/messages" },
            url: "/search/messages",
            method: "GET",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-search-user-123");
    });

    it("should generate upload key for file upload routes", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/files/upload" },
            url: "/files/upload",
            method: "POST",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-upload-user-123");
    });

    it("should generate read key for GET requests", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/messages" },
            url: "/messages",
            method: "GET",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-read-user-123");
    });

    it("should generate write key for POST requests", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/messages" },
            url: "/messages",
            method: "POST",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-write-user-123");
    });

    it("should generate write key for PUT requests", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/messages/123" },
            url: "/messages/123",
            method: "PUT",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-write-user-123");
    });

    it("should generate write key for PATCH requests", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/messages/123" },
            url: "/messages/123",
            method: "PATCH",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-write-user-123");
    });

    it("should generate write key for DELETE requests", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/messages/123" },
            url: "/messages/123",
            method: "DELETE",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-write-user-123");
    });

    it("should generate default key for unknown routes", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: "/unknown" },
            url: "/unknown",
            method: "OPTIONS",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-default-user-123");
    });

    it("should handle requests without route", () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: "/health",
            method: "GET",
          }),
        }),
      } as ExecutionContext;

      const key = guard["generateKey"](mockContext, "user-123", "throttler");
      expect(key).toBe("throttler-read-user-123");
    });
  });
});
