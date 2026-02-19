/**
 * Test Script for Random Data Generation API
 * 
 * This script demonstrates how to call the random data generation endpoint.
 * Make sure you have a valid authentication token before running.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_ENDPOINT = '/nearbychatapi/v1/chats/generate-random-data';

// You need to replace this with a valid authentication token
// To get a token, first login using the auth API
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';

/**
 * Generate random data
 */
async function generateRandomData() {
    try {
        console.log('🚀 Starting random data generation...');
        console.log(`📡 Endpoint: ${BASE_URL}${API_ENDPOINT}`);
        console.log('⏳ This may take 2-5 minutes. Please wait...\n');

        const startTime = Date.now();

        const response = await axios.post(
            `${BASE_URL}${API_ENDPOINT}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('\n✅ SUCCESS! Random data generated successfully!\n');
        console.log('📊 Summary:');
        console.log('─────────────────────────────────────────');
        console.log(`👥 Users Created:     ${response.data.data.usersCreated}`);
        console.log(`💬 Chats Created:     ${response.data.data.chatsCreated}`);
        console.log(`📨 Messages Created:  ${response.data.data.messagesCreated}`);
        console.log(`⏱️  Time Taken:        ${duration} seconds`);
        console.log('─────────────────────────────────────────\n');

        console.log('📝 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n❌ ERROR generating random data:\n');

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from server');
            console.error('Request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
        }

        console.error('\n💡 Troubleshooting:');
        console.error('1. Make sure the server is running (npm start)');
        console.error('2. Verify your AUTH_TOKEN is valid');
        console.error('3. Check if the database is connected');
        console.error('4. Ensure you have network connectivity\n');
    }
}

/**
 * Get authentication token (helper function)
 * You need to implement this based on your auth system
 */
async function getAuthToken(email, password) {
    try {
        const response = await axios.post(
            `${BASE_URL}/nearbychatapi/v1/auth/login`,
            {
                email: email,
                password: password
            }
        );

        return response.data.data.token;
    } catch (error) {
        console.error('Failed to get auth token:', error.message);
        return null;
    }
}

// Main execution
if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('\n⚠️  WARNING: Please set a valid AUTH_TOKEN in the script!\n');
    console.log('To get a token:');
    console.log('1. Login to your account using the auth API');
    console.log('2. Copy the token from the response');
    console.log('3. Replace YOUR_AUTH_TOKEN_HERE with your actual token\n');
    console.log('Example:');
    console.log('const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";\n');
} else {
    // Run the generator
    generateRandomData();
}

module.exports = { generateRandomData, getAuthToken };
