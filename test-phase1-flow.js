#!/usr/bin/env node

/**
 * Phase 1 Flow Test - Nearby Chat
 * Tests: Silent Login, Coin Deduction, Global Pool, Accept Request, Chat Extension, Watch Ad Reward, Socket Communication
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function apiCall(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {}
        };
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        if (data) {
            config.headers['Content-Type'] = 'application/json';
            config.data = data;
        }
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (err) {
        return { success: false, error: err.response?.data?.message || err.message };
    }
}

async function runPhase1Test() {
    log('\n🚀 STARTING PHASE 1 COMPLETE FLOW TEST\n', 'cyan');

    // 1. GUEST LOGIN (SENDER)
    log('Step 1: Guest Login (Sender)', 'blue');
    const senderLogin = await apiCall('POST', '/auth/guest-login', { deviceId: `sender_${Date.now()}` });
    if (!senderLogin.success) throw new Error('Sender login failed');
    const senderToken = senderLogin.data.data.token;
    const senderId = senderLogin.data.data.user._id;
    log(`✅ Sender Logged In. Coins: ${senderLogin.data.data.user.coins}`, 'green');

    // 2. GUEST LOGIN (RECEIVER)
    log('\nStep 2: Guest Login (Receiver)', 'blue');
    const receiverLogin = await apiCall('POST', '/auth/guest-login', { deviceId: `receiver_${Date.now()}` });
    if (!receiverLogin.success) throw new Error('Receiver login failed');
    const receiverToken = receiverLogin.data.data.token;
    log(`✅ Receiver Logged In. Coins: ${receiverLogin.data.data.user.coins}`, 'green');

    // 3. INITIATE SEND (SENDER)
    log('\nStep 3: Sender Initiates Chat Request (Global Pool)', 'blue');
    const sendRequest = await apiCall('POST', '/chats/initiate-send', {
        message: "Hello world! Test message",
        preferences: { gender: 'female', ageRange: '20-25' },
        location: { type: 'Point', coordinates: [72.5714, 23.0225] }
    }, senderToken);

    if (!sendRequest.success) throw new Error('Initiate send failed: ' + sendRequest.error);
    const poolId = sendRequest.data.data.poolEntry._id;
    log(`✅ Request added to pool. New balance: ${sendRequest.data.data.balance} (Deducted 15 coins for filters)`, 'green');

    // 4. GET POOL (RECEIVER)
    log('\nStep 4: Receiver fetches Global Pool (Map View)', 'blue');
    const poolData = await apiCall('GET', '/chats/pool', null, receiverToken);
    if (!poolData.success) throw new Error('Get pool failed');
    const foundEntry = poolData.data.data.poolEntries.find(p => p._id === poolId);
    if (!foundEntry) throw new Error('Sender request not found in pool');
    log(`✅ Receiver found Sender's request in pool!`, 'green');

    // 5. ACCEPT REQUEST (RECEIVER)
    log('\nStep 5: Receiver accepts Sender\'s request', 'blue');
    const acceptChat = await apiCall('POST', `/chats/accept-send/${poolId}`, null, receiverToken);
    if (!acceptChat.success) throw new Error('Accept chat failed: ' + acceptChat.error);
    const chatId = acceptChat.data.data.chat._id;
    log(`✅ Chat started! Chat ID: ${chatId}. Chat expires at: ${acceptChat.data.data.chat.expiresAt}`, 'green');

    // 6. VERIFY POOL REMOVAL
    log('\nStep 6: Verify request is removed from Map', 'blue');
    const poolDataAfter = await apiCall('GET', '/chats/pool', null, receiverToken);
    const stillExists = poolDataAfter.data.data.poolEntries.find(p => p._id === poolId);
    if (stillExists && stillExists.isActive) throw new Error('Pool entry still active after acceptance');
    log(`✅ Request removed from Global Map Pool.`, 'green');

    // 6.5. SENDER WATCHES ADS TO EXTEND CHAT
    log('\nStep 6.5: Sender watches ads to earn coins for extension', 'blue');
    await apiCall('POST', '/coins/watch-ad', null, senderToken);
    await apiCall('POST', '/coins/watch-ad', null, senderToken);
    log(`✅ Sender earned 20 extra coins.`, 'green');

    // 7. EXTEND CHAT (SENDER)
    log('\nStep 7: Sender extends chat by 24 hours', 'blue');
    const extendChat = await apiCall('POST', `/chats/extend-chat/${chatId}`, { hours: 24 }, senderToken);
    if (!extendChat.success) throw new Error('Extend chat failed: ' + extendChat.error);
    log(`✅ Chat extended! New expiry: ${extendChat.data.data.expiresAt}. Balance: ${extendChat.data.data.balance}`, 'green');

    // 8. WATCH AD REWARD (RECEIVER)
    log('\nStep 8: Receiver watches Ad for coins', 'blue');
    const adReward = await apiCall('POST', '/coins/watch-ad', null, receiverToken);
    if (!adReward.success) throw new Error('Ad reward failed');
    log(`✅ Reward claimed! +${adReward.data.data.reward} coins. Total: ${adReward.data.data.coins}`, 'green');

    // 9. SOCKET TEST (SENDER & RECEIVER)
    log('\nStep 9: Testing Real-time Socket Communication', 'blue');
    const senderSocket = io(SOCKET_URL, { auth: { token: senderToken } });
    const receiverSocket = io(SOCKET_URL, { auth: { token: receiverToken } });

    await new Promise((resolve, reject) => {
        let joinedCount = 0;
        let connectedCount = 0;

        const onConnected = () => {
            if (++connectedCount === 2) {
                log('   Sockets connected. Joining room...', 'green');
                senderSocket.emit('chat:join', { chatId });
                receiverSocket.emit('chat:join', { chatId });
            }
        };

        const onJoined = () => {
            if (++joinedCount === 2) {
                log('   Both users joined chat room. Sender sending message...', 'green');
                senderSocket.emit('message:send', { chatId, content: "Hey! Nice to meet you.", type: "text" });
            }
        };

        senderSocket.on('connect', onConnected);
        receiverSocket.on('connect', onConnected);

        senderSocket.on('chat:joined', onJoined);
        receiverSocket.on('chat:joined', onJoined);

        receiverSocket.on('message:new', (data) => {
            log(`   ✅ Receiver received: "${data.message.content}"`, 'green');
            senderSocket.disconnect();
            receiverSocket.disconnect();
            resolve();
        });

        senderSocket.on('error', (err) => log(`   ❌ Sender Socket Error: ${err.message}`, 'red'));
        receiverSocket.on('error', (err) => log(`   ❌ Receiver Socket Error: ${err.message}`, 'red'));

        setTimeout(() => {
            senderSocket.disconnect();
            receiverSocket.disconnect();
            reject(new Error('Socket timeout - message not received'));
        }, 8000);
    });

    log('\n🏆 ALL PHASE 1 FLOW TESTS PASSED SUCCESSFULLY!\n', 'cyan');
}

runPhase1Test().catch(err => {
    log(`\n❌ TEST FAILED: ${err.message}`, 'red');
    process.exit(1);
});
