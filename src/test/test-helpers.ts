import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Message } from "@/entities";
import { createMockRepository } from "@/test/test-utils";

/**
 * Integration test helper for creating a test module with real database
 * This is useful for integration tests where you want to test against a real database
 */
export class TestDatabaseHelper {
  static async createTestingModule(entities: any[] = [User, Message]) {
    return Test.createTestingModule({
      // In a real integration test, you would configure a test database here
      // For now, this serves as a template for future integration tests
    });
  }

  static async cleanupDatabase(moduleRef: TestingModule) {
    // Clean up test data after integration tests
    const userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    const messageRepo = moduleRef.get<Repository<Message>>(
      getRepositoryToken(Message),
    );

    // In integration tests, you would clean up test data here
    // await messageRepo.delete({});
    // await userRepo.delete({});
  }
}

/**
 * Custom matchers for Jest to make testing easier
 */
export const customMatchers = {
  toBeValidUUID: (received: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      message: () =>
        `expected ${received} ${pass ? "not " : ""}to be a valid UUID`,
      pass,
    };
  },

  toBeRecentDate: (received: Date, withinMs: number = 5000) => {
    const now = new Date();
    const diff = Math.abs(now.getTime() - received.getTime());
    const pass = diff <= withinMs;

    return {
      message: () =>
        `expected ${received} ${pass ? "not " : ""}to be within ${withinMs}ms of now`,
      pass,
    };
  },

  toHaveValidMessageStructure: (received: any) => {
    const requiredFields = [
      "id",
      "content",
      "isEdited",
      "isDeleted",
      "createdAt",
      "updatedAt",
      "authorId",
    ];
    const hasAllFields = requiredFields.every((field) =>
      received.hasOwnProperty(field),
    );

    return {
      message: () =>
        `expected message ${hasAllFields ? "not " : ""}to have all required fields: ${requiredFields.join(", ")}`,
      pass: hasAllFields,
    };
  },

  toHaveValidUserStructure: (received: any) => {
    const requiredFields = [
      "id",
      "username",
      "email",
      "fullName",
      "createdAt",
      "updatedAt",
    ];
    const hasAllFields = requiredFields.every((field) =>
      received.hasOwnProperty(field),
    );

    return {
      message: () =>
        `expected user ${hasAllFields ? "not " : ""}to have all required fields: ${requiredFields.join(", ")}`,
      pass: hasAllFields,
    };
  },
};

/**
 * Error assertion helpers
 */
export class ErrorAssertions {
  static expectNotFoundException(error: any, message?: string) {
    expect(error).toBeInstanceOf(NotFoundException);
    if (message) {
      expect(error.message).toBe(message);
    }
  }

  static expectConflictException(error: any, message?: string) {
    expect(error).toBeInstanceOf(ConflictException);
    if (message) {
      expect(error.message).toBe(message);
    }
  }

  static expectForbiddenException(error: any, message?: string) {
    expect(error).toBeInstanceOf(ForbiddenException);
    if (message) {
      expect(error.message).toBe(message);
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

    return { result, duration };
  }

  static expectExecutionTime(duration: number, maxMs: number) {
    expect(duration).toBeLessThan(maxMs);
  }
}

/**
 * Data generation utilities for testing different scenarios
 */
export class TestDataGenerator {
  static generateRandomString(length: number = 10): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomEmail(domain: string = "example.com"): string {
    const username = this.generateRandomString(8);
    return `${username}@${domain}`;
  }

  static generateLongString(length: number): string {
    return "a".repeat(length);
  }

  static generateSpecialCharacterString(): string {
    return "!@#$%^&*()_+-=[]{}|;:,.<>?";
  }

  static generateUnicodeString(): string {
    return "测试用户名åäöüñ🚀👍";
  }

  static generateMaliciousString(): string {
    return '<script>alert("xss")</script>';
  }

  static generateSQLInjectionString(): string {
    return "'; DROP TABLE users; --";
  }

  static generateEdgeCaseStrings(): string[] {
    return [
      "", // Empty string
      " ", // Single space
      "   ", // Multiple spaces
      "\n\t\r", // Whitespace characters
      this.generateLongString(10000), // Very long string
      this.generateSpecialCharacterString(),
      this.generateUnicodeString(),
      this.generateMaliciousString(),
      this.generateSQLInjectionString(),
    ];
  }
}

/**
 * Mock response builders for consistent test data
 */
export class MockResponseBuilder {
  static buildPaginatedResponse<T>(
    items: T[],
    page: number = 1,
    limit: number = 20,
    total?: number,
  ) {
    return {
      messages: items,
      total: total ?? items.length,
      page,
      limit,
    };
  }

  static buildRepliesResponse<T>(
    items: T[],
    page: number = 1,
    limit: number = 10,
    total?: number,
  ) {
    return {
      replies: items,
      total: total ?? items.length,
      page,
      limit,
    };
  }

  static buildErrorResponse(
    statusCode: number,
    message: string,
    error: string,
  ) {
    return {
      statusCode,
      timestamp: new Date().toISOString(),
      path: "/test",
      method: "GET",
      error,
      message,
    };
  }
}

/**
 * Async testing utilities
 */
export class AsyncTestUtils {
  static async expectAsyncToThrow<T>(
    asyncFn: () => Promise<T>,
    expectedError: new (...args: any[]) => Error,
    expectedMessage?: string,
  ) {
    let error: Error | null = null;
    try {
      await asyncFn();
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeInstanceOf(expectedError);
    if (expectedMessage) {
      expect(error?.message).toBe(expectedMessage);
    }
  }

  static async expectAsyncToResolve<T>(
    asyncFn: () => Promise<T>,
    expectedValue?: T,
  ): Promise<T> {
    const result = await asyncFn();
    if (expectedValue !== undefined) {
      expect(result).toEqual(expectedValue);
    }
    return result;
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Repository mock builder with common patterns
 */
export class RepositoryMockBuilder<T> {
  private readonly mock = createMockRepository<T>();

  findOneReturns(value: T | null) {
    (this.mock.findOne as jest.Mock).mockResolvedValue(value);
    return this;
  }

  findReturns(values: T[]) {
    (this.mock.find as jest.Mock).mockResolvedValue(values);
    return this;
  }

  findAndCountReturns(values: T[], count: number) {
    (this.mock.findAndCount as jest.Mock).mockResolvedValue([values, count]);
    return this;
  }

  countReturns(count: number) {
    (this.mock.count as jest.Mock).mockResolvedValue(count);
    return this;
  }

  saveReturns(value: T) {
    (this.mock.save as jest.Mock).mockResolvedValue(value);
    return this;
  }

  createReturns(value: T) {
    (this.mock.create as jest.Mock).mockReturnValue(value);
    return this;
  }

  throwsError(error: Error) {
    Object.values(this.mock).forEach((method) => {
      if (jest.isMockFunction(method)) {
        method.mockRejectedValue(error);
      }
    });
    return this;
  }

  build() {
    return this.mock;
  }
}

// Export all utilities
export {
  createMockRepository,
  createMockUser,
  createMockMessage,
  testUser1,
  testUser2,
  testMessage1,
  testMessage2,
  TEST_ERRORS,
} from "@/test/test-utils";
