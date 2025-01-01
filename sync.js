// sync.js
const cron = require('node-cron');
const db = require('./db');
const fetch = require('node-fetch');
const _ = require('lodash');

const VAULT_NAMES = {
    "0xE567DCf433F97d787dF2359bDBF95dFd2B7aBF4E": "lov-sUSDe-b",
    "0xb9dad3693AEAc9025Cb24a47AFA6930539877187": "lov-PT-sUSDe-Oct2024-a",
    "0x235e2afeAA56497436987E87bb475D04BEFC1394": "lov-wETH-DAI-long-a",
    "0x7FC862A47BBCDe3812CA772Ae851d0A9D1619eDa": "lov-sUSDe-a",
    "0xdE6d401E4B651F313edB7da0A11e072EEf4Ce7BE": "lov-sDAI-a",
    "0x9C1F7237480c030Cb14375Ff6b650606248A5247": "lov-weETH-a",
    "0xBd46AbF8999E979C4Ec507E8bE06b5D4402A0205": "lov-PT-USD0++-Mar2025-a",
    "0x71520ce2DB377AFa999bc6fdc1af896B21b2F26a": "lov-rswETH-a",
    "0x9fA6D162E32A08B323ADEaE2560F0E44D6dBE53c": "lov-USDe-b",
    "0xC03C434D8430d27bb16f07658be4352BeAD17eA5": "lov-wstETH-b",
    "0xcA92bccEB7349347bB14bd5748820659e198c632": "lov-PT-cornLBTC-Dec2024-a",
    "0x26DF9465964C2cEF869281c09a10F7Dd7b1321a7": "lov-AAVE-USDC-long-a",
    "0x117b36e79aDadD8ea81fbc53Bfc9CD33270d845D": "lov-wstETH-a",
    "0xCaB062047F8b3e2CecB27206d8399899eC4ad2eB": "lov-PT-eBTC-Dec2024-a",
    "0x78F3108a8dDf0faaE25862d4008DE3adF129A8e6": "lov-USD0++-a",
    "0xDb4f1Bb3f8c9929aaFbe7197e10ffaFEEAe19B9A": "lov-PT-sUSDe-Mar2025-a",
    "0xD71Df8f4aa216A21Fa4994167adB65d866cE9B7f": "lov-PT-LBTC-Mar2025-a",
    "0x0f90a6962e86b5587b4c11bA2B9697dC3bA84800": "sUSDS + Sky Farms",
    "0xC65a88A7b7752873a3106BD864BBCd717e35d2e5": "lov-USDe-a",
    "0xC242487172641eEf13626C2c426CB3d41BebC6DE": "lov-woETH-a",
    "0x5Ca7539f4a3D0E5006523C1380898898457E927f": "lov-WETH-CBBTC-long-a",
    "0xC3979edD2bC308D536964b9515161C8551D0aE3a": "lov-wETH-sDAI-short-a"
};

class SyncService {
  constructor() {
    // Schedule sync at 2 AM CET
    cron.schedule('0 2 * * *', () => {
      console.log('Starting daily sync...');
      this.syncAllData();
    }, {
      timezone: "Europe/Paris"
    });
  }

  async syncAllData() {
    try {
      console.log('Fetching data from API...');
      const response = await fetch(
        'https://origami.automation-templedao.link/points_allocation?holder_address=ilike.*'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch points data');
      }

      const allPoints = await response.json();
      console.log('Total data points received:', allPoints.length);

      // Process all unique addresses
      const uniqueAddresses = _.uniq(
        allPoints.map(item => item.holder_address.toLowerCase())
      );

      console.log(`Processing ${uniqueAddresses.length} unique addresses...`);

      for (const address of uniqueAddresses) {
        const userPoints = allPoints.filter(
          item => item.holder_address.toLowerCase() === address
        );

        // Calculate stats for each address
        const stats = this.calculateStats(userPoints, allPoints);
        await db.updatePoints(stats);
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during sync:', error);
    }
  }

  calculateStats(userPoints, allPoints) {
    // Calculate rank
    const aggregatedData = _(allPoints)
      .groupBy('holder_address')
      .map((items, addr) => ({
        address: addr,
        totalPoints: _.sumBy(items, 'allocation')
      }))
      .orderBy(['totalPoints'], ['desc'])
      .value();

    const address = userPoints[0].holder_address.toLowerCase();
    const currentRank = aggregatedData.findIndex(item =>
      item.address.toLowerCase() === address
    ) + 1;

    let pointsToNextRank = 0;
    if (currentRank > 1) {
      const nextRankPoints = aggregatedData[currentRank - 2]?.totalPoints || 0;
      const userTotal = _.sumBy(userPoints, 'allocation');
      pointsToNextRank = Math.max(0, nextRankPoints - userTotal);
    }

    // Calculate season points
    const s1Points = _.sumBy(
      userPoints.filter(item => ['P-1', 'P-2'].includes(item.points_id)),
      'allocation'
    );
    const s2Points = _.sumBy(
      userPoints.filter(item => item.points_id === 'P-6'),
      'allocation'
    );

    // Calculate vault stats
    const vaultStats = _(userPoints)
      .groupBy('token_address')
      .map((items, vault) => ({
        vault,
        vaultName: VAULT_NAMES[vault] || `${vault.slice(0, 6)}...${vault.slice(-4)}`,
        points: _.sumBy(items, 'allocation')
      }))
      .orderBy(['points'], ['desc'])
      .value();

    // Calculate streak
    const pointsByDay = _(userPoints)
      .groupBy(item => new Date(item.timestamp).toISOString().split('T')[0])
      .mapValues(items => _.sumBy(items, 'allocation'))
      .value();

    const dates = Object.keys(pointsByDay).sort();
    let maxStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const nextDate = i < dates.length - 1 ? new Date(dates[i + 1]) : null;
      
      if (nextDate && (nextDate - currentDate) / (1000 * 60 * 60 * 24) === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      address,
      currentRank,
      pointsToNextRank,
      totalPoints: _.sumBy(userPoints, 'allocation'),
      s1Points,
      s2Points,
      longestStreak: maxStreak + 1,
      uniqueVaultCount: vaultStats.length,
      topVault: {
        vault: vaultStats[0].vaultName || vaultStats[0].vault, // Use friendly name if available
        points: vaultStats[0].points
      }
    };
  }

  // Method to force a sync (useful for testing or manual updates)
  async forceSyncNow() {
    console.log('Forcing immediate sync...');
    await this.syncAllData();
  }
}

module.exports = new SyncService();