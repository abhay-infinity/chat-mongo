const Chat = require('../../../model/Chat.model');
const Message = require('../../../model/Message.model');
const User = require('../../../model/User.model');
const MessagePool = require('../../../model/MessagePool.model');
const { getAppSetting } = require('../../../utils/settings');

// Get All Chats
exports.getAllChats = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const chats = await Chat.find({
            participants: req.userId,
            isActive: true
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Chat.countDocuments({
            participants: req.userId,
            isActive: true
        });

        res.json({
            success: true,
            data: {
                chats,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all chats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chats',
            error: error.message
        });
    }
};

// Get or Create Private Chat
exports.getOrCreatePrivateChat = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const otherUser = await User.findById(userId);
        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if chat already exists
        let chat = await Chat.findOne({
            type: 'private',
            participants: { $all: [req.userId, userId] }
        })
            .populate('participants', '-password')
            .populate('lastMessage');

        // Create new chat if doesn't exist
        if (!chat) {
            chat = new Chat({
                type: 'private',
                participants: [req.userId, userId]
            });
            await chat.save();
            await chat.populate('participants', '-password');
        }

        res.json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        console.error('Get or create private chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating chat',
            error: error.message
        });
    }
};

// Get Chat by ID
exports.getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password');

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        res.json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        console.error('Get chat by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat',
            error: error.message
        });
    }
};

// Delete Chat
exports.deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // For group chats, only admin can delete
        if (chat.type === 'group' && chat.groupAdmin.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can delete the group'
            });
        }

        chat.isActive = false;
        await chat.save();

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting chat',
            error: error.message
        });
    }
};

// Mute/Unmute Chat
exports.toggleMuteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { mute } = req.body;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        if (mute) {
            if (!chat.mutedBy.includes(req.userId)) {
                chat.mutedBy.push(req.userId);
            }
        } else {
            chat.mutedBy = chat.mutedBy.filter(id => id.toString() !== req.userId.toString());
        }

        await chat.save();

        res.json({
            success: true,
            message: mute ? 'Chat muted' : 'Chat unmuted',
            data: { chat }
        });
    } catch (error) {
        console.error('Toggle mute chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating chat',
            error: error.message
        });
    }
};

// Clear Unread Count
exports.clearUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        chat.unreadCount.set(req.userId.toString(), 0);
        await chat.save();

        res.json({
            success: true,
            message: 'Unread count cleared'
        });
    } catch (error) {
        console.error('Clear unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing unread count',
            error: error.message
        });
    }
};

// Initiate Send (Anonymous Request Pool)
exports.initiateSend = async (req, res) => {
    try {
        const { message, preferences, location } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Calculate cost
        let cost = await getAppSetting('coin.send_request', 10);
        if (preferences && (preferences.gender !== 'any' || preferences.ageRange !== 'any')) {
            cost += await getAppSetting('coin.age_filter_extra', 5);
        }

        // Check coins
        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: user.coins
            });
        }

        // Deduct coins
        await user.deductCoins(cost, 'Initiated random chat request');

        // ================= AUTO-MATCH LOGIC =================
        // Check if there is someone compatible ALREADY in the pool
        const matchQuery = {
            isActive: true,
            expiresAt: { $gt: new Date() },
            sender: { $ne: req.userId }
        };

        // Filter by gender if specified
        if (preferences && preferences.gender && preferences.gender !== 'any') {
            matchQuery['preferences.gender'] = { $in: [user.gender, 'any'] };
        }

        const potentialMatch = await MessagePool.findOne(matchQuery)
            .populate('sender', 'username avatar gender age');

        if (potentialMatch) {
            // Check if WE are also compatible with THEM
            const theyAreAny = potentialMatch.preferences.gender === 'any';
            const weMatchThem = theyAreAny || potentialMatch.preferences.gender === user.gender;

            if (weMatchThem) {
                // MATCH FOUND! 🚀 Create chat immediately
                const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
                const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

                const chat = new Chat({
                    type: 'private',
                    participants: [potentialMatch.sender._id, req.userId],
                    isRandomChat: true,
                    expiresAt: chatExpiresAt
                });

                await chat.save();

                // Deactivate the matched pool entry
                potentialMatch.isActive = false;
                await potentialMatch.save();

                await chat.populate('participants', 'username avatar gender age');

                return res.status(201).json({
                    success: true,
                    message: 'Auto-Matched with a sender immediately!',
                    data: { chat, balance: user.coins, isMatched: true }
                });
            }
        }
        // ====================================================

        // No match found, Add to Pool instead
        const poolExpiryMinutes = await getAppSetting('limit.pool_expiry_minutes', 60);
        const expiresAt = new Date(Date.now() + poolExpiryMinutes * 60 * 1000);

        // Create Pool Entry
        const poolEntry = new MessagePool({
            sender: req.userId,
            message: message || 'Hey! Want to chat?',
            preferences: preferences || { gender: 'any', ageRange: 'any' },
            location: location || { type: 'Point', coordinates: [0, 0] },
            expiresAt
        });

        await poolEntry.save();

        res.status(201).json({
            success: true,
            message: 'Request added to global pool',
            data: { poolEntry, balance: user.coins, isMatched: false }
        });
    } catch (error) {
        console.error('Initiate send error:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating send',
            error: error.message
        });
    }
};

// Get Active Pool (For Map View)
exports.getActivePool = async (req, res) => {
    try {
        const poolEntries = await MessagePool.find({
            isActive: true,
            expiresAt: { $gt: new Date() },
            sender: { $ne: req.userId } // Don't show own requests
        }).populate('sender', 'username avatar gender age');

        res.json({
            success: true,
            data: { poolEntries }
        });
    } catch (error) {
        console.error('Get active pool error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pool',
            error: error.message
        });
    }
};

// Accept Send (Start Anonymous Chat)
exports.acceptSend = async (req, res) => {
    try {
        const { poolId } = req.params;

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry || !poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            return res.status(404).json({
                success: false,
                message: 'Request no longer available'
            });
        }

        // Create a new timed chat
        const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
        const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const chat = new Chat({
            type: 'private',
            participants: [poolEntry.sender, req.userId],
            isRandomChat: true,
            expiresAt: chatExpiresAt
        });

        await chat.save();

        // Deactivate pool entry (it will be auto-deleted by TTL soon, but mark inactive for immediate results)
        poolEntry.isActive = false;
        await poolEntry.save();

        await chat.populate('participants', 'username avatar gender age');

        res.status(201).json({
            success: true,
            message: 'Chat started successfully',
            data: { chat }
        });
    } catch (error) {
        console.error('Accept send error:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting chat',
            error: error.message
        });
    }
};

// Extend Chat Duration
exports.extendChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { hours } = req.body; // 24 or 48

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId,
            isRandomChat: true
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Timed chat not found'
            });
        }

        const user = await User.findById(req.userId);

        // Define costs
        let cost = 0;
        if (hours === 24) {
            cost = await getAppSetting('coin.extend_chat_24h', 50);
        } else if (hours === 48) {
            cost = await getAppSetting('coin.extend_chat_48h', 90);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid extension duration' });
        }

        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: user.coins
            });
        }

        // Deduct coins
        await user.deductCoins(cost, `Extended chat by ${hours} hours`);

        // Update expiry
        const currentExpiry = chat.expiresAt > new Date() ? chat.expiresAt : new Date();
        chat.expiresAt = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);
        chat.extensionCount += 1;
        await chat.save();

        res.json({
            success: true,
            message: `Chat extended by ${hours} hours`,
            data: { expiresAt: chat.expiresAt, balance: user.coins }
        });
    } catch (error) {
        console.error('Extend chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error extending chat',
            error: error.message
        });
    }
};

// Generate Random Data (200 Chats with 100 Messages Each)
// Generate 10 Random Chats with Messages
exports.generateRandomData = async (req, res) => {
  try {
    console.log('🚀 Generating 10 chats for user:', req.userId);

    /* ------------------ STATIC DATA ------------------ */

    const firstNames = [
      'John','Jane','Mike','Sarah','David','Emily','Chris','Lisa',
      'Tom','Anna','Robert','Maria','James','Linda','Michael'
    ];

    const lastNames = [
      'Smith','Johnson','Williams','Brown','Jones','Garcia',
      'Miller','Davis','Rodriguez','Martinez'
    ];

    const messageTemplates = [
      'Hey! How are you?', 'What’s up?', 'Nice to meet you!',
      'How was your day?', 'Sounds good!', 'Haha 😂',
      'Tell me more!', 'I agree with you.', 'Cool 😎',
      'Let’s catch up soon!', 'Talk later!', 'Take care!'
    ];

    const genders = ['male', 'female', 'other'];

    /* ------------------ AUTH USER ------------------ */

    const authUser = await User.findById(req.userId);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user not found'
      });
    }

    /* ------------------ STEP 1: ENSURE 50 USERS ------------------ */

    let otherUsers = await User.find({
      _id: { $ne: authUser._id }
    }).limit(50);

    const usersToCreate = 50 - otherUsers.length;

    for (let i = 0; i < usersToCreate; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Date.now()}${i}`;

      const newUser = new User({
        username,
        email: `${username}@example.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        password: 'password123',
        gender: genders[Math.floor(Math.random() * genders.length)],
        age: Math.floor(Math.random() * 40) + 18,
        isEmailVerified: true,
        isPhoneVerified: true
      });

      await newUser.save();
      otherUsers.push(newUser);
    }

    /* ------------------ STEP 2: CREATE 10 CHATS ------------------ */

    const createdChats = [];

    for (let i = 0; i < 10; i++) {

      const randomUser =
        otherUsers[Math.floor(Math.random() * otherUsers.length)];

      // Check existing chat
      let chat = await Chat.findOne({
        type: 'private',
        participants: { $all: [authUser._id, randomUser._id] }
      });

      if (chat) continue; // skip duplicate

      // Create chat
      chat = new Chat({
        type: 'private',
        participants: [authUser._id, randomUser._id],
        isActive: true,
        isRandomChat: true,
        unreadCount: new Map()
      });

      await chat.save();

      /* ------------------ STEP 3: CREATE 100 MESSAGES ------------------ */

      const messages = [];

      for (let m = 0; m < 100; m++) {
        const sender = m % 2 === 0 ? authUser._id : randomUser._id;
        const receiver = m % 2 === 0 ? randomUser._id : authUser._id;

        messages.push({
          chat: chat._id,
          sender,
          content: messageTemplates[
            Math.floor(Math.random() * messageTemplates.length)
          ],
          type: 'text',
          deliveredTo: [{ user: receiver, deliveredAt: new Date() }],
          createdAt: new Date(Date.now() - (100 - m) * 60000)
        });
      }

      const savedMessages = await Message.insertMany(messages);

      // Update chat meta
      chat.lastMessage = savedMessages[savedMessages.length - 1]._id;
      chat.unreadCount.set(authUser._id.toString(), Math.floor(Math.random() * 5));
      chat.unreadCount.set(randomUser._id.toString(), Math.floor(Math.random() * 5));
      await chat.save();

      createdChats.push({
        chatId: chat._id,
        withUser: randomUser.username,
        messages: savedMessages.length
      });
    }

    /* ------------------ RESPONSE ------------------ */

    res.status(201).json({
      success: true,
      message: '10 random chats generated successfully',
      totalChatsCreated: createdChats.length,
      chats: createdChats
    });

  } catch (error) {
    console.error('❌ Generate random chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating random chats',
      error: error.message
    });
  }
};
