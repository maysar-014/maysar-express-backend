#!/usr/bin/env node

/**
 * Memory Monitor Script for Logistics Service
 * Monitors memory usage and provides insights into memory consumption patterns
 */

const { spawn } = require('child_process');
const path = require('path');

class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.startTime = Date.now();
    this.interval = null;
  }

  startMonitoring(intervalMs = 5000) {
    console.log('🚀 Starting memory monitoring...');
    console.log('📊 Monitoring interval:', intervalMs / 1000, 'seconds');

    this.interval = setInterval(() => {
      this.takeMeasurement();
    }, intervalMs);
  }

  takeMeasurement() {
    const memUsage = process.memoryUsage();
    const measurement = {
      timestamp: Date.now(),
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100 // %
    };

    this.measurements.push(measurement);

    console.log(`📈 Memory at ${new Date(measurement.timestamp).toLocaleTimeString()}:`);
    console.log(`   RSS: ${measurement.rss}MB, Heap: ${measurement.heapUsed}MB/${measurement.heapTotal}MB (${measurement.heapUsagePercent}%)`);

    // Alert on high memory usage
    if (measurement.heapUsagePercent > 80) {
      console.warn(`⚠️  High memory usage: ${measurement.heapUsagePercent}%`);
    }

    if (measurement.heapUsagePercent > 90) {
      console.error(`🚨 Critical memory usage: ${measurement.heapUsagePercent}%`);
    }
  }

  generateReport() {
    if (this.measurements.length === 0) {
      console.log('No measurements collected');
      return;
    }

    console.log('\n📊 Memory Monitoring Report');
    console.log('=' .repeat(50));

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000;

    console.log(`Duration: ${duration.toFixed(1)} seconds`);
    console.log(`Measurements: ${this.measurements.length}`);

    // Calculate statistics
    const heapUsages = this.measurements.map(m => m.heapUsagePercent);
    const avgUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
    const maxUsage = Math.max(...heapUsages);
    const minUsage = Math.min(...heapUsages);

    console.log('\nHeap Usage Statistics:');
    console.log(`  Average: ${avgUsage.toFixed(2)}%`);
    console.log(`  Peak: ${maxUsage.toFixed(2)}%`);
    console.log(`  Minimum: ${minUsage.toFixed(2)}%`);

    console.log('\nMemory Trend:');
    const trend = this.calculateTrend(heapUsages);
    console.log(`  Trend: ${trend}`);

    const growth = ((last.heapUsed - first.heapUsed) / first.heapUsed) * 100;
    console.log(`  Growth: ${growth > 0 ? '+' : ''}${growth.toFixed(2)}%`);

    console.log('\nRecommendations:');
    if (maxUsage > 90) {
      console.log('  🚨 CRITICAL: Memory usage exceeded 90% - immediate action required');
    } else if (maxUsage > 80) {
      console.log('  ⚠️  WARNING: Memory usage exceeded 80% - monitor closely');
    } else if (maxUsage < 70) {
      console.log('  ✅ GOOD: Memory usage remained below 70%');
    }

    if (growth > 20) {
      console.log('  📈 SIGNIFICANT GROWTH: Memory grew more than 20% - possible leak');
    }
  }

  calculateTrend(usages) {
    if (usages.length < 2) return 'insufficient data';

    const firstHalf = usages.slice(0, Math.floor(usages.length / 2));
    const secondHalf = usages.slice(Math.floor(usages.length / 2));

    const firstAvg = firstHalf.reduce((sum, u) => sum + u, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, u) => sum + u, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.generateReport();
  }
}

// Main execution
if (require.main === module) {
  const monitor = new MemoryMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping memory monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  monitor.startMonitoring(3000); // Every 3 seconds

  // Auto-stop after 60 seconds for testing
  setTimeout(() => {
    console.log('\n⏰ Auto-stopping monitor after 60 seconds...');
    monitor.stop();
    process.exit(0);
  }, 60000);
}

module.exports = MemoryMonitor;
