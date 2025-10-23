# 🗃️ Database Migration Guide

## Overview

This project uses TypeORM migrations to manage database schema changes. Migrations ensure consistent database structure across different environments and deployment stages.

## 📋 Migration Commands

### Generate New Migration
```bash
# Generate migration based on entity changes
npm run migration:generate src/database/migrations/YourMigrationName

# Example
npm run migration:generate src/database/migrations/AddUserProfileFields
```

### Run Migrations
```bash
# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show

# Revert last migration
npm run migration:revert
```

### Create Empty Migration
```bash
# Create empty migration file for custom SQL
npm run migration:create src/database/migrations/YourCustomMigration
```

## 🏗️ Current Database Schema

The project includes the following entities with their relationships:

### **Users Table**
- `id` (UUID, Primary Key)
- `email` (Unique)
- `username` (Unique)
- `fullName`
- `password` (Hashed)
- `currentSessionId`
- `createdAt`, `updatedAt`

### **Messages Table**
- `id` (UUID, Primary Key)
- `content` (Text)
- `isEdited`, `isDeleted` (Boolean flags)
- `deletedAt` (Timestamp)
- `attachmentUrl`, `attachmentName`, `attachmentType`, `attachmentSize`
- `authorId` (Foreign Key → Users)
- `parentMessageId` (Foreign Key → Messages, for replies)
- `createdAt`, `updatedAt`

### **Reactions Table**
- `id` (UUID, Primary Key)
- `type` (Enum: like, dislike, heart, laugh, angry, surprised, sad, thumbs_up, thumbs_down, fire)
- `userId` (Foreign Key → Users)
- `messageId` (Foreign Key → Messages)
- `createdAt`
- **Unique Constraint**: One reaction per user per message

## 🔄 Migration Workflow

### Development
1. Modify your entities
2. Generate migration: `npm run migration:generate src/database/migrations/DescriptiveName`
3. Review generated SQL in the migration file
4. Run migration: `npm run migration:run`
5. Test your changes

### Production
- Migrations run automatically when `NODE_ENV=production`
- Set `migrationsRun: true` in database configuration
- Use CI/CD pipeline to run migrations during deployment

## ⚙️ Environment Configuration

### Required Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=adil_messenger
DB_LOGGING=false

# Migration Settings
NODE_ENV=development  # or 'production'
```

### Database Connection Settings
- **Development**: Uses `.ts` migration files from `src/database/migrations/`
- **Production**: Uses compiled `.js` migration files from `dist/database/migrations/`
- **SSL**: Automatically enabled in production with `rejectUnauthorized: false`

## 🛡️ Best Practices

### Migration Naming
- Use descriptive names: `AddUserProfileFields`, `CreateMessagesTable`
- Include date/purpose: `20231023_AddReactionsFeature`

### Migration Safety
- ✅ **Always review** generated migrations before running
- ✅ **Test migrations** in development environment first
- ✅ **Backup database** before running in production
- ✅ **Use transactions** for complex migrations

### Schema Changes
- ✅ **Additive changes** (new columns, tables) are safe
- ⚠️ **Destructive changes** (dropping columns) need careful planning
- ⚠️ **Data migrations** may require custom SQL

## 🚀 Initial Setup

### 1. Create Database
```sql
CREATE DATABASE adil_messenger;
```

### 2. Run Initial Migration
```bash
npm run migration:run
```

### 3. Verify Setup
```bash
npm run migration:show
# Should show: [X] InitialSchema1761252743920
```

## 🔍 Troubleshooting

### Common Issues

**Migration Generation Fails**
- Ensure database is running and accessible
- Check entity imports use relative paths (for CLI compatibility)
- Verify `.env` file has correct database credentials

**Migration Run Fails**
- Check database permissions
- Ensure migration files exist in correct directory
- Verify PostgreSQL version compatibility

**Entity Import Errors**
- CLI requires relative imports (`./user.entity` instead of `@/entities/user.entity`)
- Main application can use path aliases

### Debug Commands
```bash
# Check database connection
npm run migration:show

# View pending migrations
npm run migration:show

# Check entity compilation
npm run build
```

## 📚 Advanced Usage

### Custom Migrations
Create migrations with custom SQL for complex operations:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomDataMigration1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Custom SQL for data transformation
        await queryRunner.query(`
            UPDATE messages 
            SET content = 'Content deleted by user' 
            WHERE isDeleted = true AND deletedAt < NOW() - INTERVAL '30 days'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert operation (if possible)
    }
}
```

### Production Deployment
```yaml
# docker-compose.production.yml
services:
  app:
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - migrationsRun=true
```

---

**🎯 Migration system is now ready for production use!** 

The database schema will be automatically maintained and versioned across all environments.