// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

class DatabaseService {
  async initDatabase() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS points_data (
          holder_address TEXT PRIMARY KEY,
          total_points DECIMAL,
          season1_points DECIMAL,
          season2_points DECIMAL,
          rank INTEGER,
          points_to_next_rank DECIMAL,
          longest_streak INTEGER,
          unique_vault_count INTEGER,
          top_vault TEXT,
          top_vault_points DECIMAL,
          last_updated TIMESTAMP WITH TIME ZONE
        )
      `);
    } finally {
      client.release();
    }
  }

  async updatePoints(stats) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO points_data 
        (holder_address, total_points, season1_points, season2_points, 
         rank, points_to_next_rank, longest_streak, unique_vault_count,
         top_vault, top_vault_points, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (holder_address) DO UPDATE SET
          total_points = EXCLUDED.total_points,
          season1_points = EXCLUDED.season1_points,
          season2_points = EXCLUDED.season2_points,
          rank = EXCLUDED.rank,
          points_to_next_rank = EXCLUDED.points_to_next_rank,
          longest_streak = EXCLUDED.longest_streak,
          unique_vault_count = EXCLUDED.unique_vault_count,
          top_vault = EXCLUDED.top_vault,
          top_vault_points = EXCLUDED.top_vault_points,
          last_updated = NOW()
      `, [
        stats.address.toLowerCase(),
        stats.totalPoints,
        stats.s1Points,
        stats.s2Points,
        stats.currentRank,
        stats.pointsToNextRank,
        stats.longestStreak,
        stats.uniqueVaultCount,
        stats.topVault.vault,
        stats.topVault.points
      ]);
    } finally {
      client.release();
    }
  }

  async getStats(address) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM points_data WHERE holder_address = $1',
        [address.toLowerCase()]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getLastUpdateTime() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT MAX(last_updated) as last_update FROM points_data');
      return result.rows[0]?.last_update;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseService();