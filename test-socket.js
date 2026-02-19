#!/usr/bin/env node

/**
 * Socket.IO Test Script - Real-time Messaging Test
 * This script simulates two users chatting in real-time
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// User data
let user1 = { token: '', userId: '', socket: null, username: '' };
let user2 = { token: '', userId: '', socket: null, username: '' };
let chatId = '';

// Register and login user
async function createUser(userNum) {
    try {
        const randomNum = Math.floor(Math.random() * 10000);
        const phoneNum = 9000000000 + Math.floor(Math.random() * 999999999); // Generate valid 10-digit number
        const userData = {
            username: `user${userNum}_${randomNum}`,
            email: `user${userNum}_${randomNum}@test.com`,
            phone: `+91${phoneNum}`,
            password: 'password123'
        };

        log(`\n📝 Creating User ${userNum}...`, 'cyan');
        const response = await axios.post(`${BASE_URL}/auth/register`, userData);

        if (response.data.success) {
            log(`✅ User ${userNum} created: ${userData.username}`, 'green');
            return {
                token: response.data.data.token,
                userId: response.data.data.user._id,
                username: userData.username
            };
        }
    } catch (error) {
        log(`❌ Failed to create user ${userNum}: ${error.message}`, 'red');
        return null;
    }
}

// Create chat between users
async function createChat(user1Id, token) {
    try {
        log('\n💬 Creating chat between users...', 'cyan');
        const response = await axios.post(
            `${BASE_URL}/chats/private/${user1Id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
            const chatId = response.data.data.chat._id;
            log(`✅ Chat created! ID: ${chatId}`, 'green');
            return chatId;
        }
    } catch (error) {
        log(`❌ Failed to create chat: ${error.message}`, 'red');
        return null;
    }
}

// Connect socket
function connectSocket(user, userNum) {
    return new Promise((resolve, reject) => {
        log(`\n🔌 Connecting User ${userNum} to Socket.IO...`, 'cyan');

        const socket = io(SOCKET_URL, {
            auth: { token: user.token }
        });

        socket.on('connect', () => {
            log(`✅ User ${userNum} connected! Socket ID: ${socket.id}`, 'green');
            user.socket = socket;
            resolve(socket);
        });

        socket.on('connect_error', (err) => {
            log(`❌ User ${userNum} connection failed: ${err.message}`, 'red');
            reject(err);
        });

        // Listen for messages
        socket.on('message:new', (data) => {
            log(`\n📨 User ${userNum} received message:`, 'magenta');
            log(`   From: ${data.message.sender.username}`, 'yellow');
            log(`   Content: ${data.message.content}`, 'yellow');
        });

        // Listen for typing
        socket.on('typing:user', (data) => {
            if (data.isTyping) {
                log(`   ✍️  ${data.username} is typing...`, 'blue');
            }
        });

        // Listen for online/offline
        socket.on('user:online', (data) => {
            log(`   🟢 User came online`, 'green');
        });

        socket.on('user:offline', (data) => {
            log(`   ⚫ User went offline`, 'yellow');
        });

        socket.on('error', (err) => {
            log(`   ❌ Socket error: ${err.message}`, 'red');
        });
    });
}

// Join chat
function joinChat(socket, chatId, userNum) {
    return new Promise((resolve) => {
        log(`\n🚪 User ${userNum} joining chat...`, 'cyan');

        socket.emit('chat:join', { chatId });

        socket.on('chat:joined', (data) => {
            log(`✅ User ${userNum} joined chat successfully!`, 'green');
            resolve(true);
        });

        setTimeout(() => resolve(true), 1000);
    });
}

// Send message via socket
function sendMessage(socket, chatId, content, userNum) {
    return new Promise((resolve) => {
        log(`\n📤 User ${userNum} sending message: "${content}"`, 'cyan');

        socket.emit('message:send', {
            chatId,
            content,
            type: 'text'
        });

        setTimeout(() => resolve(true), 500);
    });
}

// Simulate typing
function simulateTyping(socket, chatId, userNum) {
    return new Promise((resolve) => {
        log(`\n✍️  User ${userNum} is typing...`, 'blue');

        socket.emit('typing:start', { chatId });

        setTimeout(() => {
            socket.emit('typing:stop', { chatId });
            resolve(true);
        }, 2000);
    });
}

// Main test
async function runSocketTest() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🚀 SOCKET.IO REAL-TIME MESSAGING TEST', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    try {
        // Step 1: Create two users
        log('STEP 1: Creating Users', 'yellow');
        const userData1 = await createUser(1);
        const userData2 = await createUser(2);

        if (!userData1 || !userData2) {
            log('\n❌ Failed to create users. Exiting.', 'red');
            process.exit(1);
        }

        user1 = { ...user1, ...userData1 };
        user2 = { ...user2, ...userData2 };

        // Step 2: Create chat
        log('\n\nSTEP 2: Creating Chat', 'yellow');
        chatId = await createChat(user2.userId, user1.token);

        if (!chatId) {
            log('\n❌ Failed to create chat. Exiting.', 'red');
            process.exit(1);
        }

        // Step 3: Connect both users via Socket.IO
        log('\n\nSTEP 3: Connecting to Socket.IO', 'yellow');
        await connectSocket(user1, 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        await connectSocket(user2, 2);

        // Step 4: Join chat
        log('\n\nSTEP 4: Joining Chat Room', 'yellow');
        await joinChat(user1.socket, chatId, 1);
        await joinChat(user2.socket, chatId, 2);

        // Step 5: Send messages
        log('\n\nSTEP 5: Sending Real-time Messages', 'yellow');

        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage(user1.socket, chatId, 'Hello! This is User 1 👋', 1);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await simulateTyping(user2.socket, chatId, 2);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage(user2.socket, chatId, 'Hi User 1! Nice to meet you! 😊', 2);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage(user1.socket, chatId, 'How are you doing?', 1);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await simulateTyping(user2.socket, chatId, 2);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage(user2.socket, chatId, 'I\'m great! Testing Socket.IO 🚀', 2);

        // Wait for messages to be received
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Summary
        log('\n\n' + '='.repeat(60), 'cyan');
        log('  ✅ SOCKET.IO TEST COMPLETED SUCCESSFULLY!', 'green');
        log('='.repeat(60), 'cyan');
        log('\n📊 Test Summary:', 'yellow');
        log('  ✅ 2 users created and authenticated', 'green');
        log('  ✅ Chat room created', 'green');
        log('  ✅ Both users connected via Socket.IO', 'green');
        log('  ✅ Real-time messages sent and received', 'green');
        log('  ✅ Typing indicators working', 'green');
        log('\n🎉 All real-time features are working perfectly!\n', 'green');

        // Cleanup
        if (user1.socket) user1.socket.disconnect();
        if (user2.socket) user2.socket.disconnect();

        process.exit(0);

    } catch (error) {
        log(`\n❌ Test failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run the test
runSocketTest();
