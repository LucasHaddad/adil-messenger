# Adil Messenger API

A comprehensive chat system API built with **NestJS**, **TypeScript**, **PostgreSQL**, and **TypeORM**. This API provides endpoints for sending, editing, deleting messages, and creating threaded conversations with replies.

## 🚀 Features

- **Message Management**: Send, edit, delete messages with file attachments
- **Threaded Conversations**: Reply to messages creating conversation threads
- **User Management**: Create and manage users with secure authentication
- **Authentication**: JWT-based authentication with CSRF protection
- **Authorization**: Protected routes with Bearer token validation
- **Session Management**: Secure session handling with logout functionality
- **Real-time Chat**: WebSocket integration for live messaging and presence
- **File Attachments**: Upload and share images, documents, and media files
- **Message Reactions**: React to messages with emojis and like/dislike system
- **Search Functionality**: Full-text search across messages with filters and suggestions
- **Rate Limiting**: API throttling with different limits for different endpoint types
- **Pagination**: Efficient pagination for messages and replies
- **Validation**: Comprehensive input validation using class-validator
- **Documentation**: Auto-generated Swagger/OpenAPI documentation with auth schemes
- **Error Handling**: Global exception handling with detailed error responses
- **Database**: PostgreSQL with TypeORM for robust data persistence
- **Security**: Password hashing, CSRF tokens, and global authentication guards

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

### **Rate Limiting Strategy**
- **Endpoint-specific Limits**: Different rate limits for different types of operations
- **User-based Tracking**: Authenticated users tracked by user ID, unauthenticated by IP
- **Graduated Limits**: Stricter limits for sensitive operations (auth, uploads)
- **Header Information**: Rate limit status included in response headers
- **Graceful Degradation**: Clear error messages and retry-after headers

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user and get JWT token
- `POST /api/v1/auth/logout` - Logout and invalidate session

### Users
- `GET /api/v1/users` - Get all users (requires authentication)
- `GET /api/v1/users/:id` - Get user by ID (requires authentication)
- `GET /api/v1/users/username/:username` - Get user by username (requires authentication)

### Messages
- `POST /api/v1/messages` - Send a new message or reply (requires authentication)
- `POST /api/v1/messages/with-attachment` - Send a message with file attachment (requires authentication)
- `GET /api/v1/messages` - Get all messages (paginated, requires authentication)
- `GET /api/v1/messages/:id` - Get specific message (requires authentication)
- `GET /api/v1/messages/:id/replies` - Get replies to a message (requires authentication)
- `GET /api/v1/messages/:id/thread` - Get conversation thread (requires authentication)
- `PATCH /api/v1/messages/:id` - Edit a message (requires authentication)
- `DELETE /api/v1/messages/:id` - Delete a message (requires authentication)

### Reactions
- `POST /api/v1/reactions` - Add or update a reaction to a message (requires authentication)
- `DELETE /api/v1/reactions/message/:messageId` - Remove user's reaction from a message (requires authentication)
- `GET /api/v1/reactions/message/:messageId` - Get all reactions for a message (requires authentication)
- `GET /api/v1/reactions/message/:messageId/user` - Get user's reaction to a message (requires authentication)
- `GET /api/v1/reactions/user/my-reactions` - Get user's own reactions (requires authentication)
- `GET /api/v1/reactions/user/stats` - Get user's reaction statistics (requires authentication)
- `GET /api/v1/reactions/trending` - Get trending reactions (requires authentication)

### Files
- `GET /api/v1/files/:filename` - Download or view an uploaded file (requires authentication)

### Search
- `GET /api/v1/search/messages` - Search messages with full-text search and filters (requires authentication)
- `GET /api/v1/search/suggestions` - Get autocomplete suggestions for search queries (requires authentication)
- `GET /api/v1/search/popular` - Get popular search terms (requires authentication)

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

### Register a New User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

### Login and Get JWT Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

### Sending a Message (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "content": "Hello, this is my first message!",
    "authorId": "user-uuid-here"
  }'
```

### Replying to a Message (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "content": "This is a reply!",
    "authorId": "user-uuid-here",
    "parentMessageId": "message-uuid-here"
  }'
```

### Sending a Message with Attachment (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/messages/with-attachment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -F "content=Check out this image!" \
  -F "authorId=user-uuid-here" \
  -F "file=@/path/to/image.jpg"
```

### Adding a Reaction to a Message (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/reactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "type": "like",
    "messageId": "message-uuid-here"
  }'
```

### Uploading a File (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

### Searching Messages (Authenticated)
```bash
# Search messages with query
curl -G http://localhost:3000/api/v1/search/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d "query=hello world" \
  -d "limit=20" \
  -d "offset=0"

# Search messages by user and date range
curl -G http://localhost:3000/api/v1/search/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d "userId=user-uuid-here" \
  -d "dateFrom=2023-01-01T00:00:00.000Z" \
  -d "dateTo=2023-12-31T23:59:59.999Z"
```

### Getting Search Suggestions (Authenticated)
```bash
curl -G http://localhost:3000/api/v1/search/suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d "q=hel" \
  -d "limit=5"
```

## 🏗️ Project Structure

```
src/
├── auth/                # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/      # Passport strategies
│   ├── guards/          # Auth guards
│   └── decorators/      # Auth decorators
├── controllers/          # REST API controllers
│   ├── message.controller.ts
│   ├── user.controller.ts
│   ├── file.controller.ts
│   ├── reaction.controller.ts
│   └── search.controller.ts
├── database/            # Database configuration
│   ├── data-source.ts
│   └── database.module.ts
├── dto/                 # Data Transfer Objects
│   ├── auth-response.dto.ts
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── create-message.dto.ts
│   ├── update-message.dto.ts
│   ├── create-user.dto.ts
│   ├── create-reaction.dto.ts
│   ├── reaction-response.dto.ts
│   ├── message-response.dto.ts
│   ├── message-search.dto.ts
│   └── message-search-response.dto.ts
├── entities/            # TypeORM entities
│   ├── user.entity.ts
│   ├── message.entity.ts
│   ├── reaction.entity.ts
│   └── index.ts
├── filters/             # Exception filters
│   └── global-exception.filter.ts
├── gateways/            # WebSocket gateways
│   └── chat.gateway.ts
├── guards/              # Custom guards
│   └── custom-throttler.guard.ts
├── interceptors/        # Response interceptors
│   └── rate-limit-headers.interceptor.ts
├── modules/             # NestJS modules
│   ├── auth.module.ts
│   ├── message.module.ts
│   ├── user.module.ts
│   ├── file.module.ts
│   ├── reaction.module.ts
│   ├── search.module.ts
│   └── websocket.module.ts
├── pipes/               # Validation pipes
│   └── validation.pipe.ts
├── services/            # Business logic services
│   ├── message.service.ts
│   ├── user.service.ts
│   ├── file-upload.service.ts
│   ├── reaction.service.ts
│   └── search.service.ts
└── main.ts             # Application entry point
```

## 🔒 Security Considerations

- **Input Validation**: All inputs are validated using class-validator
- **UUID Usage**: UUIDs prevent enumeration attacks
- **Authorization**: Author verification for edit/delete operations
- **Soft Deletes**: Preserve data integrity while respecting user privacy
- **CORS**: Configurable CORS settings for production deployment
- **Rate Limiting**: API throttling prevents abuse and ensures fair usage
  - Authentication endpoints: 5 requests per minute
  - File uploads: 10 requests per minute
  - Search operations: 30 requests per minute
  - Read operations: 100 requests per minute
  - Write operations: 50 requests per minute
- **Rate Limit Headers**: Transparent rate limit status in response headers

## 🚀 Future Enhancements

- **Caching**: Redis caching for improved performance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.