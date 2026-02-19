const Chat = require('../../../model/Chat.model');
const User = require('../../../model/User.model');
const { MAX_GROUP_MEMBERS } = require('../../../config/constants');

// Create Group
exports.createGroup = async (req, res) => {
    try {
        const { groupName, participants, groupAvatar } = req.body;

        if (!groupName || !participants || participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Group name and at least 2 participants are required'
            });
        }

        if (participants.length > MAX_GROUP_MEMBERS) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${MAX_GROUP_MEMBERS} members allowed`
            });
        }

        // Add creator to participants if not included
        const allParticipants = [...new Set([req.userId.toString(), ...participants])];

        const group = new Chat({
            type: 'group',
            groupName,
            groupAvatar: groupAvatar || '',
            groupAdmin: req.userId,
            participants: allParticipants
        });

        await group.save();
        await group.populate('participants', '-password');
        await group.populate('groupAdmin', '-password');

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: { group }
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating group',
            error: error.message
        });
    }
};

// Update Group
exports.updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { groupName, groupAvatar } = req.body;

        const group = await Chat.findOne({
            _id: groupId,
            type: 'group',
            groupAdmin: req.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found or you are not the admin'
            });
        }

        if (groupName) group.groupName = groupName;
        if (groupAvatar !== undefined) group.groupAvatar = groupAvatar;

        await group.save();
        await group.populate('participants', '-password');
        await group.populate('groupAdmin', '-password');

        res.json({
            success: true,
            message: 'Group updated successfully',
            data: { group }
        });
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating group',
            error: error.message
        });
    }
};

// Add Members
exports.addMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userIds } = req.body;

        const group = await Chat.findOne({
            _id: groupId,
            type: 'group',
            groupAdmin: req.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found or you are not the admin'
            });
        }

        // Add new members
        const newParticipants = [...new Set([...group.participants.map(p => p.toString()), ...userIds])];

        if (newParticipants.length > MAX_GROUP_MEMBERS) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${MAX_GROUP_MEMBERS} members allowed`
            });
        }

        group.participants = newParticipants;
        await group.save();
        await group.populate('participants', '-password');

        res.json({
            success: true,
            message: 'Members added successfully',
            data: { group }
        });
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding members',
            error: error.message
        });
    }
};

// Remove Member
exports.removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        const group = await Chat.findOne({
            _id: groupId,
            type: 'group',
            groupAdmin: req.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found or you are not the admin'
            });
        }

        // Can't remove admin
        if (userId === req.userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Admin cannot be removed. Transfer admin rights first.'
            });
        }

        group.participants = group.participants.filter(p => p.toString() !== userId);
        await group.save();
        await group.populate('participants', '-password');

        res.json({
            success: true,
            message: 'Member removed successfully',
            data: { group }
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing member',
            error: error.message
        });
    }
};

// Leave Group
exports.leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Chat.findOne({
            _id: groupId,
            type: 'group',
            participants: req.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // If admin is leaving, transfer admin to next member or delete group
        if (group.groupAdmin.toString() === req.userId.toString()) {
            const otherMembers = group.participants.filter(p => p.toString() !== req.userId.toString());

            if (otherMembers.length > 0) {
                group.groupAdmin = otherMembers[0];
            } else {
                // Last member leaving, delete group
                group.isActive = false;
                await group.save();
                return res.json({
                    success: true,
                    message: 'Group deleted as you were the last member'
                });
            }
        }

        group.participants = group.participants.filter(p => p.toString() !== req.userId.toString());
        await group.save();

        res.json({
            success: true,
            message: 'Left group successfully'
        });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error leaving group',
            error: error.message
        });
    }
};

// Upload Group Avatar
exports.uploadGroupAvatar = async (req, res) => {
    try {
        const { groupId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const group = await Chat.findOne({
            _id: groupId,
            type: 'group',
            groupAdmin: req.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found or you are not the admin'
            });
        }

        const avatarUrl = `/uploads/groups/${req.file.filename}`;
        group.groupAvatar = avatarUrl;
        await group.save();

        res.json({
            success: true,
            message: 'Group avatar updated successfully',
            data: { avatarUrl }
        });
    } catch (error) {
        console.error('Upload group avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading group avatar',
            error: error.message
        });
    }
};
