# Adil Messenger API

A comprehensive chat system API built with **NestJS**, **TypeScript**, **PostgreSQL**, and **TypeORM**. This API provides endpoints for sending, editing, deleting messages, and creating threaded conversations with replies.

## 🚀 Features

- **Message Management**: Send, edit, delete messages
- **Threaded Conversations**: Reply to messages creating conversation threads
- **User Management**: Create and manage users
- **Pagination**: Efficient pagination for messages and replies
- **Validation**: Comprehensive input validation using class-validator
- **Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Error Handling**: Global exception handling with detailed error responses
- **Database**: PostgreSQL with TypeORM for robust data persistence

## 🏗️ Architecture & Design Decisions

### **Why NestJS?**
- **Modular Architecture**: Clean separation of concerns with modules, services, and controllers
- **Decorator-based**: TypeScript decorators for validation, routing, and dependency injection
- **Built-in Features**: Integrated support for validation, pipes, guards, and filters
- **Swagger Integration**: Automatic API documentation generation

### **Database Design**
- **Self-referencing Messages**: Messages can have replies through a `parentMessageId` field
- **Soft Deletes**: Messages are marked as deleted rather than physically removed
- **UUID Primary Keys**: More secure and scalable than auto-incrementing integers
- **Eager Loading**: User information is loaded with messages for better performance

### **API Design Principles**
- **RESTful**: Following REST conventions for intuitive API usage
- **Stateless**: Each request contains all necessary information
- **Consistent**: Uniform response structure and error handling
- **Versioned**: API versioning through URL prefix (`/api/v1`)

## 📚 API Endpoints

### Users
- `POST /api/v1/users` - Create a new user
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `GET /api/v1/users/username/:username` - Get user by username

### Messages
- `POST /api/v1/messages` - Send a new message or reply
- `GET /api/v1/messages` - Get all messages (paginated)
- `GET /api/v1/messages/:id` - Get specific message
- `GET /api/v1/messages/:id/replies` - Get replies to a message
- `GET /api/v1/messages/:id/thread` - Get conversation thread
- `PATCH /api/v1/messages/:id` - Edit a message
- `DELETE /api/v1/messages/:id` - Delete a message

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adil-messenger
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE adil_messenger;
   ```

5. **Run the application**
   ```bash
   # Development mode
   yarn start:dev
   
   # Production build
   yarn build
   yarn start:prod
   ```

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api/v1`

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=adil_messenger
DB_SYNCHRONIZE=true
DB_LOGGING=true

# JWT Configuration (for future authentication)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
```

## 📝 Usage Examples

### Creating a User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe"
  }'
```

### Sending a Message
```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, this is my first message!",
    "authorId": "user-uuid-here"
  }'
```

### Replying to a Message
```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a reply!",
    "authorId": "user-uuid-here",
    "parentMessageId": "message-uuid-here"
  }'
```

### Editing a Message
```bash
curl -X PATCH http://localhost:3000/api/v1/messages/{messageId}?authorId={authorId} \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated message content"
  }'
```

## 🏗️ Project Structure

```
src/
├── controllers/          # REST API controllers
│   ├── message.controller.ts
│   └── user.controller.ts
├── database/            # Database configuration
│   ├── data-source.ts
│   └── database.module.ts
├── dto/                 # Data Transfer Objects
│   ├── create-message.dto.ts
│   ├── update-message.dto.ts
│   ├── create-user.dto.ts
│   └── message-response.dto.ts
├── entities/            # TypeORM entities
│   ├── user.entity.ts
│   ├── message.entity.ts
│   └── index.ts
├── filters/             # Exception filters
│   └── global-exception.filter.ts
├── modules/             # NestJS modules
│   ├── message.module.ts
│   ├── user.module.ts
│   └── app.module.ts
├── pipes/               # Validation pipes
│   └── validation.pipe.ts
├── services/            # Business logic services
│   ├── message.service.ts
│   └── user.service.ts
└── main.ts             # Application entry point
```

## 🔒 Security Considerations

- **Input Validation**: All inputs are validated using class-validator
- **UUID Usage**: UUIDs prevent enumeration attacks
- **Authorization**: Author verification for edit/delete operations
- **Soft Deletes**: Preserve data integrity while respecting user privacy
- **CORS**: Configurable CORS settings for production deployment

## 🚀 Future Enhancements

- **Authentication**: JWT-based user authentication
- **Real-time**: WebSocket integration for live chat
- **File Uploads**: Support for media attachments
- **Message Reactions**: Like, dislike, emoji reactions
- **Search**: Full-text search across messages
- **Rate Limiting**: API rate limiting and throttling
- **Caching**: Redis caching for improved performance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.