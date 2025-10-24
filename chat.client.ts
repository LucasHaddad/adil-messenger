import { io, Socket } from 'socket.io-client';
import * as process from 'process';

class ChatClient {
  private readonly socket: Socket;
  private readonly currentUserId: string;

  constructor(token, userId) {
    this.currentUserId = userId;
    this.socket = io('ws://localhost:3000/chat', {
      auth: { token, userId },
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      printWithoutInterruption('✅ Connected to chat');
    });

    this.socket.on('disconnect', () => {
      printWithoutInterruption('❌ Disconnected from chat');
    });

    this.socket.on('error', error => {
      printWithoutInterruption('🚨 Socket error: ' + error.message);
    });

    // Message events
    this.socket.on('newMessage', message => {
      this.displayMessage(message);
    });

    this.socket.on('messageUpdated', data => {
      printWithoutInterruption('📝 Message updated: ' + JSON.stringify(data));
    });

    this.socket.on('messageDeleted', data => {
      printWithoutInterruption('🗑️ Message deleted: ' + JSON.stringify(data));
    });

    this.socket.on('messageReply', data => {
      printWithoutInterruption(
        '💬 Reply to your message: ' + JSON.stringify(data),
      );
    });

    // Room events
    this.socket.on('userJoinedRoom', data => {
      printWithoutInterruption(
        `👋 User ${data.userId} joined room ${data.roomId}`,
      );
    });

    this.socket.on('userLeftRoom', data => {
      printWithoutInterruption(
        `👋 User ${data.userId} left room ${data.roomId}`,
      );
    });

    // User presence
    this.socket.on('userOnline', data => {
      this.updateUserStatus(data.userId, 'online');
    });

    this.socket.on('userOffline', data => {
      this.updateUserStatus(data.userId, 'offline');
    });

    this.socket.on('onlineUsers', data => {
      printWithoutInterruption(
        '👥 Online users: ' + JSON.stringify(data.users),
      );
    });

    // Typing indicators
    this.socket.on('userTyping', data => {
      if (data.userId !== this.currentUserId) {
        this.showTypingIndicator(data.userId);
      }
    });

    this.socket.on('userStoppedTyping', data => {
      if (data.userId !== this.currentUserId) {
        this.hideTypingIndicator(data.userId);
      }
    });
  }

  // Methods to interact with the gateway
  joinRoom(roomId) {
    this.socket.emit('joinRoom', { roomId });
  }

  leaveRoom(roomId) {
    this.socket.emit('leaveRoom', { roomId });
  }

  sendMessage(content, parentMessageId = null) {
    this.socket.emit('sendMessage', { content, parentMessageId });
    // Show sent confirmation to sender
    printWithoutInterruption('✅ Message sent');
  }

  startTyping(roomId) {
    this.socket.emit('typing', { roomId, isTyping: true });
  }

  stopTyping(roomId) {
    this.socket.emit('typing', { roomId, isTyping: false });
  }

  displayMessage(message) {
    const timestamp = new Date(message.createdAt).toLocaleTimeString();
    const authorInfo = message.author
      ? `${message.author.username} (${message.author.id})`
      : message.authorId;
    const parentInfo = message.parentMessageId
      ? ` [Reply to: ${message.parentMessageId}]`
      : '';

    // Only show messages from other users (sender already sees sent confirmation)
    const messageAuthorId = message.author
      ? message.author.id
      : message.authorId;
    if (messageAuthorId !== this.currentUserId) {
      printWithoutInterruption(
        `📨 [${timestamp}] ${authorInfo}: ${message.content}${parentInfo}`,
      );
    }
  }

  updateUserStatus(userId, status) {
    const emoji = status === 'online' ? '🟢' : '🔴';
    printWithoutInterruption(`${emoji} User ${userId} is ${status}`);
  }

  showTypingIndicator(userId) {
    printWithoutInterruption(`⌨️ User ${userId} is typing...`);
  }

  hideTypingIndicator(userId) {
    printWithoutInterruption(`⌨️ User ${userId} stopped typing.`);
  }

  // Additional utility methods
  getOnlineUsers() {
    this.socket.emit('getOnlineUsers');
  }

  disconnect() {
    this.socket.disconnect();
  }

  // Public method to access socket events
  onConnect(callback: () => void) {
    this.socket.on('connect', callback);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: ts-node chat.client.ts <JWT_TOKEN> <USER_ID> [ROOM_ID]');
  console.log(
    'Example: ts-node chat.client.ts eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... user-123 general',
  );
  process.exit(1);
}

const [jwtToken, userId, roomId = 'general'] = args;

console.log(`Connecting as user: ${userId}`);
console.log(`Using token: ${jwtToken.substring(0, 20)}...`);
console.log(`Joining room: ${roomId}`);

const chatClient = new ChatClient(jwtToken, userId);

let isConnected = false;
let currentRoom = roomId;
let typingTimer: NodeJS.Timeout | null = null;
let isTyping = false;
let currentInput = '';

// Utility functions for cursor management
function saveCurrentLine() {
  // Clear current line and save cursor position
  process.stdout.write('\r\x1b[K');
}

function restoreCurrentLine() {
  // Restore the input prompt and current input
  process.stdout.write('> ' + currentInput);
}

function printWithoutInterruption(message: string) {
  // Save current line
  saveCurrentLine();
  // Print the message
  console.log(message);
  // Restore the input line
  restoreCurrentLine();
}

// Function to start interactive chat
function startInteractiveChat() {
  console.log('\n💬 Interactive chat mode started!');
  console.log('📝 Type your messages and press Enter to send.');
  console.log('💡 Special commands:');
  console.log('   /quit - Exit the chat');
  console.log('   /room <roomId> - Switch to a different room');
  console.log('   /online - Show online users');
  console.log('   /help - Show this help message');
  console.log('─'.repeat(50));

  setupRealTimeInput();
}

function setupRealTimeInput() {
  // Set up raw mode for character-by-character input
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  console.log('💭 Type your message: ');
  process.stdout.write('> ');

  process.stdin.on('data', (key: string) => {
    const keyCode = key.charCodeAt(0);

    // Handle Enter key (send message)
    if (keyCode === 13) {
      handleEnterKey();
      return;
    }

    // Handle Backspace key
    if (keyCode === 127 || keyCode === 8) {
      handleBackspace();
      return;
    }

    // Handle Ctrl+C (exit)
    if (keyCode === 3) {
      console.log('\n👋 Goodbye!');
      chatClient.disconnect();
      process.exit(0);
    }

    // Handle regular characters
    if (keyCode >= 32 && keyCode <= 126) {
      handleCharacterInput(key);
    }
  });
}

function handleCharacterInput(char: string) {
  currentInput += char;
  process.stdout.write(char);

  // Start typing indicator if not already typing
  if (!isTyping && isConnected) {
    isTyping = true;
    chatClient.startTyping(currentRoom);
  }

  // Reset the typing timeout
  if (typingTimer) {
    clearTimeout(typingTimer);
  }

  // Set new timeout for 10 seconds
  typingTimer = setTimeout(() => {
    if (isTyping && isConnected) {
      isTyping = false;
      chatClient.stopTyping(currentRoom);
    }
    typingTimer = null;
  }, 10000);
}

function handleBackspace() {
  if (currentInput.length > 0) {
    currentInput = currentInput.slice(0, -1);
    process.stdout.write('\b \b');

    // If input becomes empty, don't trigger typing
    if (currentInput.length === 0 && isTyping) {
      if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      isTyping = false;
      chatClient.stopTyping(currentRoom);
    } else if (currentInput.length > 0) {
      // Reset typing timeout if there's still content
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      typingTimer = setTimeout(() => {
        if (isTyping && isConnected) {
          isTyping = false;
          chatClient.stopTyping(currentRoom);
        }
        typingTimer = null;
      }, 10000);
    }
  }
}

function handleEnterKey() {
  process.stdout.write('\n');

  // Stop typing indicator immediately when message is sent
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  if (isTyping) {
    isTyping = false;
    chatClient.stopTyping(currentRoom);
  }

  const input = currentInput.trim();
  currentInput = '';

  if (!input) {
    process.stdout.write('> ');
    return;
  }

  // Handle special commands
  if (input.startsWith('/')) {
    handleCommand(input);
  } else {
    // Send regular message
    if (isConnected) {
      chatClient.sendMessage(input);
    } else {
      printWithoutInterruption('⚠️ Not connected yet. Please wait...');
    }
  }

  process.stdout.write('> ');
}

function handleCommand(command: string) {
  const [cmd, ...args] = command.split(' ');

  switch (cmd.toLowerCase()) {
    case '/quit':
    case '/exit':
      console.log('👋 Goodbye!');
      chatClient.disconnect();
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.exit(0);

    case '/room':
      if (args.length > 0) {
        const newRoom = args[0];
        printWithoutInterruption(
          `🏠 Switching from room "${currentRoom}" to "${newRoom}"`,
        );
        chatClient.leaveRoom(currentRoom);
        chatClient.joinRoom(newRoom);
        currentRoom = newRoom;

        // Reset typing state when switching rooms
        if (typingTimer) {
          clearTimeout(typingTimer);
          typingTimer = null;
        }
        if (isTyping) {
          isTyping = false;
        }
      } else {
        printWithoutInterruption('❌ Usage: /room <roomId>');
      }
      break;

    case '/online':
      printWithoutInterruption('👥 Requesting online users...');
      chatClient.getOnlineUsers();
      break;

    case '/help':
      // For help command, we want to show multiple lines, so we clear and restore once
      saveCurrentLine();
      console.log('\n💡 Available commands:');
      console.log('   /quit - Exit the chat');
      console.log('   /room <roomId> - Switch to a different room');
      console.log('   /online - Show online users');
      console.log('   /help - Show this help message');
      restoreCurrentLine();
      break;

    default:
      printWithoutInterruption(
        `❌ Unknown command: ${cmd}. Type /help for available commands.`,
      );
  }
}

// Wait for connection before starting interactive mode
chatClient.onConnect(() => {
  printWithoutInterruption(`🏠 Joining room: ${roomId}`);
  chatClient.joinRoom(roomId);
  isConnected = true;

  // Get online users after joining
  setTimeout(() => {
    chatClient.getOnlineUsers();
  }, 1000);

  // Start interactive chat after a short delay
  setTimeout(() => {
    startInteractiveChat();
  }, 2000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔌 Disconnecting from chat...');
  chatClient.disconnect();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
});

// Initial connection message
console.log('\n💡 Chat client is connecting...');
console.log('   Please wait for the interactive chat to start.');
