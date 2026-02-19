/**
 * Complete Broadcast Flow Test Script
 * Tests all broadcast-related APIs and socket events
 * 
 * Usage: node test-broadcast-flow.js
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/nearbychatapi/v1`;

// Test users
let broadcaster = { token: '', userId: '', socket: null };
let receiver = { token: '', userId: '', socket: null };

let poolId = null;
let requestId = null;

// Helper to make API calls
async function apiCall(method, endpoint, token, data = null) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        if (data) config.data = data;
        
        console.log(`\n📤 [${method}] ${endpoint}`);
        if (data) console.log('📤 Body:', JSON.stringify(data, null, 2));
        
        const response = await axios(config);
        console.log(`📥 [${response.status}] Response:`, JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error(`❌ [${error.response?.status || 'ERROR'}]`, error.response?.data || error.message);
        throw error;
    }
}

// Connect socket
function connectSocket(user, userNum) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔌 Connecting User ${userNum} via Socket.IO...`);
        
        const socket = io(BASE_URL, {
            auth: { token: user.token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log(`✅ User ${userNum} connected! Socket ID: ${socket.id}`);
            user.socket = socket;
            resolve(socket);
        });

        socket.on('connect_error', (err) => {
            console.error(`❌ User ${userNum} connection error:`, err.message);
            reject(err);
        });

        socket.onAny((event, data) => {
            console.log(`📥 [USER ${userNum}] Event: "${event}"`, JSON.stringify(data, null, 2));
        });

        socket.on('error', (err) => {
            console.error(`🚨 [USER ${userNum}] Socket error:`, err);
        });
    });
}

async function testBroadcastFlow() {
    console.log('🚀 BROADCAST FLOW TEST\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Register/Login users
        console.log('\n📝 STEP 1: Creating test users...');
        
        const broadcasterRes = await axios.post(`${API_URL}/auth/guest-login`, {
            deviceId: `test-broadcaster-${Date.now()}`
        });
        broadcaster.token = broadcasterRes.data.token;
        broadcaster.userId = broadcasterRes.data.user._id;
        console.log(`✅ Broadcaster: ${broadcaster.userId}`);

        const receiverRes = await axios.post(`${API_URL}/auth/guest-login`, {
            deviceId: `test-receiver-${Date.now()}`
        });
        receiver.token = receiverRes.data.token;
        receiver.userId = receiverRes.data.user._id;
        console.log(`✅ Receiver: ${receiver.userId}`);

        // Add coins to both users
        await apiCall('POST', '/coins/add', broadcaster.token, { amount: 100 });
        await apiCall('POST', '/coins/add', receiver.token, { amount: 100 });

        // Step 2: Connect sockets
        console.log('\n📝 STEP 2: Connecting sockets...');
        await connectSocket(broadcaster, 1);
        await connectSocket(receiver, 2);

        // Step 3: Create broadcast
        console.log('\n📝 STEP 3: Creating broadcast...');
        const broadcastRes = await apiCall('POST', '/chats/initiate-send', broadcaster.token, {
            message: 'Test broadcast message',
            preferences: {
                gender: 'any',
                ageRange: 'any'
            },
            location: {
                type: 'Point',
                coordinates: [0, 0] // Test coordinates
            }
        });

        if (broadcastRes.data.isMatched) {
            console.log('⚠️ Auto-matched! Skipping to chat creation test.');
            return;
        }

        poolId = broadcastRes.data.poolEntry._id;
        console.log(`✅ Broadcast created! Pool ID: ${poolId}`);

        // Step 4: Get active pool
        console.log('\n📝 STEP 4: Getting active pool (receiver view)...');
        await apiCall('GET', `/chats/pool?latitude=0&longitude=0&radius=5000`, receiver.token);

        // Step 5: Send connection request
        console.log('\n📝 STEP 5: Sending connection request...');
        const requestRes = await apiCall('POST', `/chats/send-request/${poolId}`, receiver.token, {
            message: 'Test request message'
        });
        requestId = requestRes.data.request._id;
        console.log(`✅ Request sent! Request ID: ${requestId}`);

        // Wait for socket event
        console.log('\n⏳ Waiting for request:new socket event...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 6: Get connection requests
        console.log('\n📝 STEP 6: Getting connection requests (broadcaster view)...');
        const requestsRes = await apiCall('GET', `/chats/requests/${poolId}`, broadcaster.token);
        console.log(`✅ Found ${requestsRes.data.requests.length} requests`);

        // Step 7: Accept request
        console.log('\n📝 STEP 7: Accepting request...');
        const acceptRes = await apiCall('POST', `/chats/accept-request/${requestId}`, broadcaster.token);
        console.log(`✅ Request accepted! Chat ID: ${acceptRes.data.chat._id}`);

        // Wait for socket events
        console.log('\n⏳ Waiting for request:accepted socket events...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n✅ ALL TESTS PASSED!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    } finally {
        // Cleanup
        if (broadcaster.socket) broadcaster.socket.disconnect();
        if (receiver.socket) receiver.socket.disconnect();
        process.exit(0);
    }
}

testBroadcastFlow();
