const Settings = require('../model/Settings.model');
const { getCache, setCache } = require('../config/redis');

/**
 * Get application setting with Redis caching
 */
const getAppSetting = async (key, defaultValue) => {
    try {
        // Try Cache
        const cached = await getCache(`setting:${key}`);
        if (cached !== null) return cached;

        // Try DB
        const setting = await Settings.findOne({ key });
        if (setting) {
            await setCache(`setting:${key}`, setting.value, 24 * 60 * 60);
            return setting.value;
        }

        return defaultValue;
    } catch (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return defaultValue;
    }
};

/**
 * Get all coin prices dynamically
 */
const getDynamicCoinPrices = async () => {
    return {
        sendImage: await getAppSetting('coin.image_message', 2),
        sendVideo: await getAppSetting('coin.video_message', 5),
        createGroup: await getAppSetting('coin.create_group', 10),
        sendLocation: await getAppSetting('coin.location_share', 1),
        voiceCall: await getAppSetting('coin.voice_call_per_min', 5),
        videoCall: await getAppSetting('coin.video_call_per_min', 10),
        textMessage: await getAppSetting('coin.text_message', 0)
    };
};

module.exports = {
    getAppSetting,
    getDynamicCoinPrices
};
