const redisClient = require("../../config/redis");

const CACHE_TTL = 60 * 60 * 24; // 24 hours

const cacheMiddleware = (cacheKey) => {
  return async (req, res, next) => {
    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return res.status(200).json({
          status: "SUCCESS",
          message: "Data fetched successfully (cache)",
          data: JSON.parse(cachedData),
        });
      }

      next();
    } catch (error) {
      console.error("Redis middleware error:", error);
      next();
    }
  };
};

module.exports = {
  cacheMiddleware,
  CACHE_TTL,
};

