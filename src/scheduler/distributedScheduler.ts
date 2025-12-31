import { Redis } from 'ioredis';

// Job configuration interface
export interface ScheduledJob {
  name: string;
  interval: number; // milliseconds
  job: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errors: number;
}

// Scheduler configuration
export interface DistributedSchedulerConfig {
  redisUrl?: string;
  redisPassword?: string;
  leaderKey?: string;
  leaderTTL?: number; // seconds
  checkInterval?: number; // milliseconds
  serviceName?: string;
  heartbeatInterval?: number; // milliseconds
}

// Scheduler events
export interface SchedulerEvents {
  onLeaderElected: () => void;
  onLeaderLost: () => void;
  onJobStarted: (jobName: string) => void;
  onJobCompleted: (jobName: string, duration: number) => void;
  onJobFailed: (jobName: string, error: Error) => void;
}

/**
 * Distributed Job Scheduler with Redis-based Leader Election
 * Ensures only one instance runs scheduled jobs in a horizontally scaled environment
 */
export class DistributedScheduler {
  private redis: Redis;
  private config: Required<DistributedSchedulerConfig>;
  private instanceId: string;
  private isLeader = false;
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private events: Partial<SchedulerEvents> = {};
  private checkTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: DistributedSchedulerConfig = {}, events?: Partial<SchedulerEvents>) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      redisPassword: config.redisPassword || process.env.REDIS_PASSWORD || undefined,
      leaderKey: config.leaderKey || 'scheduler:leader',
      leaderTTL: config.leaderTTL || 30, // 30 seconds
      checkInterval: config.checkInterval || 10000, // 10 seconds
      serviceName: config.serviceName || process.env.SERVICE_NAME || 'unknown-service',
      heartbeatInterval: config.heartbeatInterval || 15000 // 15 seconds
    };

    this.instanceId = `${this.config.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.events = events || {};

    // Initialize Redis connection
    this.redis = new Redis(this.config.redisUrl, {
      password: this.config.redisPassword,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupRedisEvents();
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisEvents(): void {
    this.redis.on('connect', () => {
      console.log('🔗 DistributedScheduler Redis connected');
      if (!this.isRunning) {
        this.start();
      }
    });

    this.redis.on('error', (error) => {
      console.error('❌ DistributedScheduler Redis error:', error);
    });

    this.redis.on('close', () => {
      console.log('🔌 DistributedScheduler Redis disconnected');
      this.isRunning = false;
    });
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await this.redis.connect();
      this.isRunning = true;

      console.log(`🚀 DistributedScheduler started (Instance: ${this.instanceId})`);

      // Start leader election process
      await this.attemptLeaderElection();

      // Start periodic leadership checks
      this.checkTimer = setInterval(async () => {
        await this.checkLeadership();
      }, this.config.checkInterval);

      // Start heartbeat if we're the leader
      if (this.isLeader) {
        this.startHeartbeat();
      }

    } catch (error) {
      console.error('❌ Failed to start DistributedScheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping DistributedScheduler...');

    // Stop leadership checks
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Stop all job intervals
    this.stopAllJobs();

    // Release leadership if we hold it
    if (this.isLeader) {
      await this.releaseLeadership();
    }

    // Close Redis connection
    await this.redis.quit();

    this.isRunning = false;
    console.log('✅ DistributedScheduler stopped');
  }

  /**
   * Attempt to become the leader
   */
  private async attemptLeaderElection(): Promise<void> {
    try {
      const result = await this.redis.set(
        this.config.leaderKey,
        this.instanceId,
        'NX', // Only set if key doesn't exist
        'EX', // Set expiry
        this.config.leaderTTL
      );

      const wasLeader = this.isLeader;
      this.isLeader = result === 'OK';

      if (this.isLeader && !wasLeader) {
        console.log(`👑 Instance ${this.instanceId} became the leader`);
        this.events.onLeaderElected?.();
        this.startAllJobs();
        this.startHeartbeat();
      } else if (!this.isLeader && wasLeader) {
        console.log(`💔 Instance ${this.instanceId} lost leadership`);
        this.events.onLeaderLost?.();
        this.stopAllJobs();
        this.stopHeartbeat();
      }

    } catch (error) {
      console.error('❌ Leader election failed:', error);
      this.isLeader = false;
    }
  }

  /**
   * Check current leadership status
   */
  private async checkLeadership(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const currentLeader = await this.redis.get(this.config.leaderKey);

      if (currentLeader === this.instanceId) {
        // Extend our leadership
        await this.redis.expire(this.config.leaderKey, this.config.leaderTTL);

        if (!this.isLeader) {
          console.log(`👑 Instance ${this.instanceId} regained leadership`);
          this.isLeader = true;
          this.events.onLeaderElected?.();
          this.startAllJobs();
          this.startHeartbeat();
        }
      } else if (this.isLeader) {
        // We lost leadership
        console.log(`💔 Instance ${this.instanceId} lost leadership to ${currentLeader}`);
        this.isLeader = false;
        this.events.onLeaderLost?.();
        this.stopAllJobs();
        this.stopHeartbeat();

        // Try to become leader again
        setTimeout(() => this.attemptLeaderElection(), Math.random() * 5000);
      } else if (!currentLeader) {
        // No leader exists, try to become one
        await this.attemptLeaderElection();
      }

    } catch (error) {
      console.error('❌ Leadership check failed:', error);
    }
  }

  /**
   * Release leadership
   */
  private async releaseLeadership(): Promise<void> {
    try {
      const currentLeader = await this.redis.get(this.config.leaderKey);
      if (currentLeader === this.instanceId) {
        await this.redis.del(this.config.leaderKey);
        console.log(`🆓 Instance ${this.instanceId} released leadership`);
      }
    } catch (error) {
      console.error('❌ Failed to release leadership:', error);
    }
  }

  /**
   * Start heartbeat to maintain leadership
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(async () => {
      if (this.isLeader) {
        try {
          await this.redis.expire(this.config.leaderKey, this.config.leaderTTL);
        } catch (error) {
          console.error('❌ Heartbeat failed:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Add a scheduled job
   */
  addJob(job: Omit<ScheduledJob, 'lastRun' | 'nextRun' | 'runCount' | 'errors'>): void {
    const scheduledJob: ScheduledJob = {
      ...job,
      lastRun: undefined,
      nextRun: undefined,
      runCount: 0,
      errors: 0
    };

    this.jobs.set(job.name, scheduledJob);

    if (this.isLeader && job.enabled) {
      this.startJob(job.name);
    }

    console.log(`📅 Added job: ${job.name} (interval: ${job.interval}ms)`);
  }

  /**
   * Remove a scheduled job
   */
  removeJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      this.stopJob(jobName);
      this.jobs.delete(jobName);
      console.log(`🗑️ Removed job: ${jobName}`);
    }
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobName: string, enabled: boolean): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.enabled = enabled;

      if (this.isLeader) {
        if (enabled) {
          this.startJob(jobName);
        } else {
          this.stopJob(jobName);
        }
      }

      console.log(`${enabled ? '✅' : '❌'} Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Start a specific job
   */
  private startJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (!job || !job.enabled) return;

    if (this.intervals.has(jobName)) return; // Already running

    const interval = setInterval(async () => {
      await this.runJob(jobName);
    }, job.interval);

    this.intervals.set(jobName, interval);
    job.nextRun = new Date(Date.now() + job.interval);

    console.log(`▶️ Started job: ${jobName}`);
  }

  /**
   * Stop a specific job
   */
  private stopJob(jobName: string): void {
    const interval = this.intervals.get(jobName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobName);

      const job = this.jobs.get(jobName);
      if (job) {
        job.nextRun = undefined;
      }

      console.log(`⏸️ Stopped job: ${jobName}`);
    }
  }

  /**
   * Start all enabled jobs
   */
  private startAllJobs(): void {
    for (const [jobName, job] of this.jobs) {
      if (job.enabled) {
        this.startJob(jobName);
      }
    }
  }

  /**
   * Stop all jobs
   */
  private stopAllJobs(): void {
    for (const jobName of this.intervals.keys()) {
      this.stopJob(jobName);
    }
  }

  /**
   * Run a job
   */
  private async runJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job || !job.enabled || !this.isLeader) return;

    const startTime = Date.now();
    job.lastRun = new Date();

    this.events.onJobStarted?.(jobName);

    try {
      console.log(`🔄 Running job: ${jobName}`);
      await job.job();
      job.runCount++;

      const duration = Date.now() - startTime;
      console.log(`✅ Job completed: ${jobName} (${duration}ms)`);
      this.events.onJobCompleted?.(jobName, duration);

    } catch (error) {
      job.errors++;
      console.error(`❌ Job failed: ${jobName}`, error);
      this.events.onJobFailed?.(jobName, error as Error);
    }

    job.nextRun = new Date(Date.now() + job.interval);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      instanceId: this.instanceId,
      isLeader: this.isLeader,
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.values()).map(job => ({
        name: job.name,
        enabled: job.enabled,
        interval: job.interval,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        runCount: job.runCount,
        errors: job.errors
      }))
    };
  }

  /**
   * Get current leader
   */
  async getCurrentLeader(): Promise<string | null> {
    try {
      return await this.redis.get(this.config.leaderKey);
    } catch (error) {
      console.error('❌ Failed to get current leader:', error);
      return null;
    }
  }

  /**
   * Force leadership takeover (for testing/admin purposes)
   */
  async forceLeadershipTakeover(): Promise<boolean> {
    try {
      const result = await this.redis.set(
        this.config.leaderKey,
        this.instanceId,
        'EX',
        this.config.leaderTTL
      );

      if (result === 'OK') {
        console.log(`⚡ Force leadership takeover: ${this.instanceId}`);
        if (!this.isLeader) {
          this.isLeader = true;
          this.events.onLeaderElected?.();
          this.startAllJobs();
          this.startHeartbeat();
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Force leadership takeover failed:', error);
      return false;
    }
  }

  /**
   * Get job statistics
   */
  getJobStats(jobName?: string) {
    if (jobName) {
      const job = this.jobs.get(jobName);
      return job ? {
        name: job.name,
        enabled: job.enabled,
        interval: job.interval,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        runCount: job.runCount,
        errors: job.errors,
        isRunning: this.intervals.has(jobName)
      } : null;
    }

    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      enabled: job.enabled,
      interval: job.interval,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      errors: job.errors,
      isRunning: this.intervals.has(job.name)
    }));
  }
}

// Export singleton instance
let schedulerInstance: DistributedScheduler | null = null;

export const getScheduler = (
  config?: DistributedSchedulerConfig,
  events?: Partial<SchedulerEvents>
): DistributedScheduler => {
  if (!schedulerInstance) {
    schedulerInstance = new DistributedScheduler(config, events);
  }
  return schedulerInstance;
};

export const closeScheduler = async (): Promise<void> => {
  if (schedulerInstance) {
    await schedulerInstance.stop();
    schedulerInstance = null;
  }
};
