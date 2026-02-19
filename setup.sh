#!/bin/bash

# Nearby Chat - Quick Setup Script

echo "🌍 Nearby Chat - Setup Script"
echo "=============================="
echo ""

# Check if MongoDB is running
echo "📦 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   sudo systemctl start mongodb"
    echo "   OR"
    echo "   mongod"
    echo ""
else
    echo "✅ MongoDB is running"
fi

# Check if Redis is running
echo "📦 Checking Redis..."
if ! pgrep -x "redis-server" > /dev/null; then
    echo "⚠️  Redis is not running. Please start Redis first:"
    echo "   sudo systemctl start redis"
    echo "   OR"
    echo "   redis-server"
    echo ""
else
    echo "✅ Redis is running"
fi

# Check if .env exists
echo "📝 Checking environment file..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
else
    echo "✅ .env file exists"
fi

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads/avatars
mkdir -p uploads/messages
mkdir -p uploads/groups
echo "✅ Upload directories created"

echo ""
echo "=============================="
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Make sure MongoDB and Redis are running"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:5000/test-client.html"
echo ""
echo "Happy coding! 🚀"
