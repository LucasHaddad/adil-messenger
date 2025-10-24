#!/bin/bash

# Chat Client Runner Script
# Usage: ./run-chat-client.sh <JWT_TOKEN> <USER_ID> [ROOM_ID]

if [ $# -lt 2 ]; then
    echo "❌ Error: Missing required arguments"
    echo ""
    echo "Usage: ./run-chat-client.sh <JWT_TOKEN> <USER_ID> [ROOM_ID]"
    echo ""
    echo "Arguments:"
    echo "  JWT_TOKEN  - Your JWT authentication token"
    echo "  USER_ID    - Your user ID"
    echo "  ROOM_ID    - Chat room to join (optional, defaults to 'general')"
    echo ""
    echo "Example:"
    echo "  ./run-chat-client.sh \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\" \"user-123\" \"general\""
    echo ""
    echo "💡 Tip: You can get a JWT token by logging in through the API:"
    echo "  curl -X POST http://localhost:3000/api/v1/auth/login \\"
    echo "       -H \"Content-Type: application/json\" \\"
    echo "       -d '{\"username\":\"your-username\",\"password\":\"your-password\"}'"
    exit 1
fi

JWT_TOKEN="$1"
USER_ID="$2"
ROOM_ID="${3:-general}"

echo "🚀 Starting interactive chat client..."
echo "👤 User ID: $USER_ID"
echo "🏠 Room: $ROOM_ID"
echo "🔑 Token: ${JWT_TOKEN:0:20}..."
echo ""
echo "💡 Once connected, you can:"
echo "   • Type messages and press Enter to send"
echo "   • Use /quit to exit"
echo "   • Use /room <roomId> to switch rooms"
echo "   • Use /online to see online users"
echo "   • Use /help for more commands"
echo ""

# Run the TypeScript chat client
npx ts-node -r tsconfig-paths/register chat.client.ts "$JWT_TOKEN" "$USER_ID" "$ROOM_ID"