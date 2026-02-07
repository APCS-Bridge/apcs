#!/bin/bash

# Setup script for notification system

echo "🔧 Setting up Notification System..."
echo ""

# Step 1: Check if Redis is running
echo "1️⃣ Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   - Ubuntu/Debian: sudo systemctl start redis-server"
    echo "   - macOS: brew services start redis"
    exit 1
fi
echo ""

# Step 2: Check for Firebase credentials
echo "2️⃣ Checking Firebase credentials..."
if [ -f "src/config/firebase-admin.json" ]; then
    echo "✅ Firebase credentials found"
else
    echo "⚠️  Firebase credentials not found at src/config/firebase-admin.json"
    echo "   Please download your Firebase service account key and save it there."
    echo "   You can continue without it, but push notifications won't work."
fi
echo ""

# Step 3: Check for .env file
echo "3️⃣ Checking environment variables..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your configuration."
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi
echo ""

# Step 4: Generate Prisma Client
echo "4️⃣ Generating Prisma Client..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma Client generated successfully"
else
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi
echo ""

# Step 5: Check if migration is needed
echo "5️⃣ Checking database migrations..."
echo "Run 'npx prisma migrate dev' if you haven't created the notification_tokens table yet."
echo ""

echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Update your .env file with proper configuration"
echo "   2. Ensure Redis is running: redis-cli ping"
echo "   3. Add Firebase credentials to src/config/firebase-admin.json"
echo "   4. Run: npm run dev"
echo ""
echo "📖 For detailed setup instructions, see: NOTIFICATION_SETUP.md"
