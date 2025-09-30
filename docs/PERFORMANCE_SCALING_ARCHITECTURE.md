# Performance & Scaling Architecture

## Overview

This document outlines the performance optimization strategies and scaling architecture for PLED to support enterprise-grade workloads while maintaining deterministic FSM execution and event sourcing guarantees.

## Performance Targets

### Primary SLAs

| Metric | Target | Critical Threshold |
|--------|---------|-------------------|
| Event Ingestion | p95 < 100ms | p99 < 500ms |
| FSM State Transition | p95 < 200ms | p99 < 1s |
| Message Processing | p95 < 300ms | p99 < 2s |
| Action Execution | p95 < 5s | p99 < 30s |
| Full Replay (10k events) | < 30s | < 2 minutes |
| API Response Time | p95 < 200ms | p99 < 1s |

### Throughput Targets

| Operation | Target TPS | Peak TPS |
|-----------|------------|----------|
| Event Ingestion | 1,000 | 5,000 |
| FSM Executions | 500 | 2,000 |
| Concurrent Executions | 10,000 | 50,000 |
| Rule Evaluations | 2,000 | 10,000 |
| Action Executions | 100 | 500 |

## Scaling Architecture

### 1. Horizontal Scaling Strategy

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Load Balancer │  │  API Gateway    │  │   CDN/Cache     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                    │
┌─────────────────────────────────────────────────────────────┐
│                     Service Mesh                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│ API Service     │ FSM Engine      │ Rule Engine             │
│ (Stateless)     │ (Stateless)     │ (Stateless)            │
│ 3-10 instances  │ 5-20 instances  │ 3-15 instances         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Action Runner   │ Event Processor │ Snapshot Service        │
│ (Stateless)     │ (Stateless)     │ (Stateless)            │
│ 2-8 instances   │ 3-12 instances  │ 2-5 instances          │
└─────────────────┴─────────────────┴─────────────────────────┘
          │                   │                    │
┌─────────────────┬─────────────────┬─────────────────────────┐
│   PostgreSQL    │     Redis       │    Message Queue        │
│   (Primary +    │   (Cluster)     │     (Kafka/RabbitMQ)   │
│   Read Replicas)│                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 2. Service Decomposition

**Microservice Architecture**
```typescript
interface ServiceTopology {
  // Core Services
  apiGateway: ServiceConfig;      // Request routing & authentication
  fsmEngine: ServiceConfig;       // FSM execution and state management
  ruleEngine: ServiceConfig;      // Event → Message transformation
  actionRunner: ServiceConfig;    // Action execution coordination
  eventProcessor: ServiceConfig; // Event ingestion and validation

  // Supporting Services
  snapshotService: ServiceConfig; // State snapshot management
  replayService: ServiceConfig;   // Deterministic replay engine
  auditService: ServiceConfig;    // Audit logging and compliance
  metricsService: ServiceConfig;  // Performance monitoring

  // Infrastructure
  messageQueue: QueueConfig;      // Event and action queues
  cacheLayer: CacheConfig;        // Multi-tier caching
  database: DatabaseConfig;       // Persistent storage
}

interface ServiceConfig {
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  healthCheck: HealthCheckConfig;
  scalingPolicy: ScalingPolicy;
}
```

### 3. Database Scaling Strategy

**Read/Write Separation**
```typescript
interface DatabaseTopology {
  primary: {
    node: 'postgresql-primary',
    purpose: 'writes + consistent reads',
    specifications: {
      cpu: '8 cores',
      memory: '32GB',
      storage: '1TB SSD',
      connections: 200
    }
  };

  readReplicas: [
    {
      node: 'postgresql-read-1',
      purpose: 'template and execution reads',
      lag: '<10ms',
      specifications: {
        cpu: '4 cores',
        memory: '16GB',
        storage: '500GB SSD'
      }
    },
    {
      node: 'postgresql-read-2',
      purpose: 'analytics and reporting',
      lag: '<100ms',
      specifications: {
        cpu: '8 cores',
        memory: '32GB',
        storage: '1TB SSD'
      }
    }
  ];

  analyticsDB: {
    node: 'postgresql-analytics',
    purpose: 'historical data and reporting',
    sync: 'async replication',
    retention: '7 years'
  };
}
```

**Partitioning Strategy**
```sql
-- Partition events by execution_id hash for parallel processing
CREATE TABLE events (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL,
  seq BIGINT NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (execution_id);

-- Create 16 partitions for even distribution
CREATE TABLE events_p0 PARTITION OF events FOR VALUES WITH (modulus 16, remainder 0);
CREATE TABLE events_p1 PARTITION OF events FOR VALUES WITH (modulus 16, remainder 1);
-- ... continue for all 16 partitions

-- Partition ledger entries by time for efficient archival
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL,
  seq BIGINT NOT NULL,
  entry_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions with automatic cleanup
CREATE TABLE ledger_entries_2024_01 PARTITION OF ledger_entries
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Performance Optimization Strategies

### 1. Caching Architecture

**Multi-Layer Caching**
```typescript
interface CacheArchitecture {
  // L1: Application-level caching (in-process)
  applicationCache: {
    technology: 'Node.js Map/LRU',
    purpose: 'compiled FSM definitions, rule metadata',
    ttl: '5 minutes',
    size: '100MB per instance'
  };

  // L2: Distributed caching (Redis)
  distributedCache: {
    technology: 'Redis Cluster',
    purpose: 'rule results, execution state, API responses',
    ttl: 'varies by content type',
    size: '10GB'
  };

  // L3: CDN caching (CloudFlare/AWS CloudFront)
  cdnCache: {
    technology: 'CloudFlare',
    purpose: 'static assets, OpenAPI spec, documentation',
    ttl: '24 hours',
    size: 'unlimited'
  };
}

class SmartCacheManager {
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // L1 Cache check
    let result = this.l1Cache.get(key);
    if (result) return result;

    // L2 Cache check
    result = await this.l2Cache.get(key);
    if (result) {
      this.l1Cache.set(key, result, ttl || 300); // 5 min default
      return result;
    }

    // Cache miss - fetch and populate all levels
    result = await fetcher();

    await this.l2Cache.set(key, result, ttl || 3600); // 1 hour default
    this.l1Cache.set(key, result, ttl || 300);

    return result;
  }

  // Cache warming for critical paths
  async warmCache(): Promise<void> {
    // Pre-load frequently accessed templates
    const popularTemplates = await this.getPopularTemplates();
    await Promise.all(popularTemplates.map(t => this.compileAndCache(t)));

    // Pre-load active execution states
    const activeExecutions = await this.getActiveExecutions();
    await Promise.all(activeExecutions.map(e => this.cacheExecutionState(e)));
  }
}
```

### 2. Database Performance Optimization

**Indexing Strategy**
```sql
-- Primary performance indexes
CREATE INDEX CONCURRENTLY idx_events_execution_seq ON events (execution_id, seq);
CREATE INDEX CONCURRENTLY idx_events_type_timestamp ON events (type, timestamp);
CREATE INDEX CONCURRENTLY idx_executions_template_status ON executions (template_id, status);
CREATE INDEX CONCURRENTLY idx_messages_execution_timestamp ON messages (execution_id, timestamp);

-- Rule evaluation performance
CREATE INDEX CONCURRENTLY idx_rules_template_type ON rules (template_id, type) WHERE enabled = true;
CREATE INDEX CONCURRENTLY idx_rule_cache_lookup ON rule_cache (rule_id, event_hash);

-- Analytics and reporting indexes
CREATE INDEX CONCURRENTLY idx_ledger_entries_time_execution ON ledger_entries (created_at, execution_id);
CREATE INDEX CONCURRENTLY idx_actions_status_created ON actions (status, created_at);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_executions_running ON executions (updated_at)
  WHERE status IN ('running', 'paused');
CREATE INDEX CONCURRENTLY idx_failed_actions ON actions (created_at, error_json)
  WHERE status = 'failed';
```

**Query Optimization**
```typescript
class OptimizedQueries {
  // Batch loading to reduce N+1 queries
  async loadExecutionsWithTemplates(executionIds: string[]): Promise<ExecutionWithTemplate[]> {
    const query = `
      SELECT
        e.*,
        t.name as template_name,
        t.model as template_model
      FROM executions e
      JOIN templates t ON e.template_id = t.id
      WHERE e.id = ANY($1)
    `;

    return this.db.query(query, [executionIds]);
  }

  // Optimized pagination with cursor-based pagination
  async getEventsPaginated(
    executionId: string,
    cursor?: number,
    limit = 100
  ): Promise<PaginatedResult<Event>> {
    const query = `
      SELECT * FROM events
      WHERE execution_id = $1
        AND ($2::bigint IS NULL OR seq > $2)
      ORDER BY seq ASC
      LIMIT $3
    `;

    const events = await this.db.query(query, [executionId, cursor, limit + 1]);
    const hasMore = events.length > limit;

    return {
      data: hasMore ? events.slice(0, -1) : events,
      hasMore,
      nextCursor: hasMore ? events[events.length - 2].seq : null
    };
  }

  // Aggregated queries to reduce round trips
  async getExecutionSummary(executionId: string): Promise<ExecutionSummary> {
    const query = `
      WITH execution_stats AS (
        SELECT
          e.*,
          t.name as template_name,
          (SELECT COUNT(*) FROM events WHERE execution_id = e.id) as event_count,
          (SELECT COUNT(*) FROM messages WHERE execution_id = e.id) as message_count,
          (SELECT COUNT(*) FROM actions WHERE execution_id = e.id AND status = 'pending') as pending_actions,
          (SELECT COUNT(*) FROM actions WHERE execution_id = e.id AND status = 'failed') as failed_actions
        FROM executions e
        JOIN templates t ON e.template_id = t.id
        WHERE e.id = $1
      )
      SELECT * FROM execution_stats
    `;

    return this.db.queryOne(query, [executionId]);
  }
}
```

### 3. FSM Engine Optimization

**State Machine Compilation Optimization**
```typescript
class OptimizedFSMCompiler {
  compile(template: TemplateDocument): CompiledFSM {
    const compiled = this.basicCompile(template);

    // Optimization passes
    return this.optimize(compiled);
  }

  private optimize(fsm: CompiledFSM): CompiledFSM {
    // Pre-compute transition matrices for O(1) lookups
    const transitionMatrix = new Map<string, Map<string, FSMTransition>>();

    for (const transition of fsm.transitions) {
      if (!transitionMatrix.has(transition.from)) {
        transitionMatrix.set(transition.from, new Map());
      }
      transitionMatrix.get(transition.from)!.set(transition.trigger, transition);
    }

    // Pre-compile guard expressions for faster evaluation
    const guardEvaluators = new Map<string, Function>();
    for (const [stateId, guard] of Object.entries(fsm.guards || {})) {
      if (guard) {
        guardEvaluators.set(stateId, this.compileExpression(guard));
      }
    }

    // Pre-build action lookup maps
    const stateActions = new Map<string, FSMAction[]>();
    for (const [stateId, actions] of Object.entries(fsm.stateActions || {})) {
      stateActions.set(stateId, this.optimizeActions(actions));
    }

    return {
      ...fsm,
      transitionMatrix,
      guardEvaluators,
      stateActions,
      // Add performance metadata
      metadata: {
        compiledAt: Date.now(),
        stateCount: fsm.states.length,
        transitionCount: fsm.transitions.length,
        optimizationVersion: '1.0'
      }
    };
  }

  private compileExpression(expression: string): Function {
    // Compile JSONLogic expressions to JavaScript functions for faster evaluation
    try {
      return new Function('variables', 'message', `
        const { jsonLogic } = require('json-logic-js');
        return jsonLogic.apply(${JSON.stringify(expression)}, { variables, message });
      `);
    } catch (error) {
      console.error('Failed to compile expression:', expression, error);
      return () => false;
    }
  }
}
```

### 4. Event Processing Pipeline Optimization

**Parallel Processing Architecture**
```typescript
interface EventProcessingConfig {
  // Partition events by execution_id for parallel processing
  partitionStrategy: 'execution_id' | 'round_robin' | 'consistent_hash';

  // Worker configuration
  workers: {
    eventIngestion: { count: 4, queueSize: 1000 };
    ruleEvaluation: { count: 8, queueSize: 500 };
    fsmExecution: { count: 6, queueSize: 300 };
    actionRunner: { count: 4, queueSize: 200 };
  };

  // Batch processing for efficiency
  batchSizes: {
    eventIngestion: 50;
    ruleEvaluation: 20;
    stateSnapshots: 100;
  };
}

class ParallelEventProcessor {
  async processEventBatch(events: Event[]): Promise<ProcessingResult[]> {
    // Group events by execution_id for ordered processing within executions
    const eventsByExecution = this.groupByExecution(events);

    // Process each execution's events in parallel
    const processingPromises = Object.entries(eventsByExecution).map(
      ([executionId, executionEvents]) =>
        this.processExecutionEvents(executionId, executionEvents)
    );

    const results = await Promise.allSettled(processingPromises);

    return results.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []
    );
  }

  private async processExecutionEvents(
    executionId: string,
    events: Event[]
  ): Promise<ProcessingResult[]> {
    // Ensure ordered processing within a single execution
    const results: ProcessingResult[] = [];

    for (const event of events) {
      try {
        const result = await this.processSingleEvent(executionId, event);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        results.push({ event, success: false, error });
      }
    }

    return results;
  }
}
```

## Auto-Scaling Configuration

### 1. Container Orchestration (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pled-fsm-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pled-fsm-engine
  template:
    metadata:
      labels:
        app: pled-fsm-engine
    spec:
      containers:
      - name: fsm-engine
        image: pled/fsm-engine:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pled-fsm-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pled-fsm-engine
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: pending_fsm_transitions
      target:
        type: AverageValue
        averageValue: "10"
```

### 2. Application-Level Auto-Scaling

```typescript
class AutoScaler {
  private metrics: MetricsCollector;
  private scaler: ContainerScaler;

  async checkScalingConditions(): Promise<void> {
    const current = await this.getCurrentMetrics();
    const recommendations = this.calculateScalingRecommendations(current);

    for (const rec of recommendations) {
      if (rec.confidence > 0.8) {
        await this.executeScaling(rec);
      }
    }
  }

  private calculateScalingRecommendations(metrics: SystemMetrics): ScalingRecommendation[] {
    const recommendations: ScalingRecommendation[] = [];

    // Scale FSM Engine based on pending transitions
    if (metrics.pendingFSMTransitions > 100) {
      recommendations.push({
        service: 'fsm-engine',
        action: 'scale-up',
        targetReplicas: Math.min(
          metrics.currentReplicas + 2,
          this.maxReplicas['fsm-engine']
        ),
        reason: 'High pending transition count',
        confidence: 0.9
      });
    }

    // Scale Rule Engine based on evaluation latency
    if (metrics.ruleEvaluationLatencyP95 > 1000) {
      recommendations.push({
        service: 'rule-engine',
        action: 'scale-up',
        targetReplicas: Math.min(
          metrics.currentReplicas + 1,
          this.maxReplicas['rule-engine']
        ),
        reason: 'High rule evaluation latency',
        confidence: 0.85
      });
    }

    return recommendations;
  }
}
```

## Performance Monitoring

### 1. Key Performance Indicators

```typescript
interface PerformanceMetrics {
  // Latency metrics
  eventIngestionLatency: LatencyMetrics;
  ruleEvaluationLatency: LatencyMetrics;
  fsmTransitionLatency: LatencyMetrics;
  actionExecutionLatency: LatencyMetrics;

  // Throughput metrics
  eventsPerSecond: number;
  transitionsPerSecond: number;
  actionsPerSecond: number;

  // Resource utilization
  cpuUtilization: number;
  memoryUtilization: number;
  diskIOPS: number;
  networkThroughput: number;

  // Business metrics
  activeExecutions: number;
  dailyActiveTemplates: number;
  errorRate: number;
  availabilityPercent: number;
}

class PerformanceMonitor {
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.collectCurrentMetrics();
    const trends = await this.analyzeTrends(metrics);
    const recommendations = this.generateOptimizationRecommendations(metrics, trends);

    return {
      timestamp: Date.now(),
      metrics,
      trends,
      recommendations,
      slaCompliance: this.calculateSLACompliance(metrics)
    };
  }

  private generateOptimizationRecommendations(
    metrics: PerformanceMetrics,
    trends: TrendAnalysis
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Database optimization recommendations
    if (metrics.databaseLatency.p95 > 100) {
      recommendations.push({
        type: 'database',
        priority: 'high',
        description: 'Consider adding read replicas or optimizing queries',
        expectedImprovement: '30-50% latency reduction'
      });
    }

    // Caching recommendations
    if (metrics.cacheHitRate < 0.8) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Increase cache TTL or add cache warming',
        expectedImprovement: '20-30% latency reduction'
      });
    }

    return recommendations;
  }
}
```

### 2. Alerting Configuration

```typescript
interface AlertRule {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  threshold: number;
  duration: string;
  notification: NotificationConfig;
}

const performanceAlerts: AlertRule[] = [
  {
    name: 'High API Latency',
    condition: 'api_response_time_p95 > 500',
    severity: 'warning',
    threshold: 500,
    duration: '5m',
    notification: { slack: '#alerts', pagerduty: false }
  },
  {
    name: 'FSM Processing Backlog',
    condition: 'pending_fsm_transitions > 500',
    severity: 'critical',
    threshold: 500,
    duration: '2m',
    notification: { slack: '#alerts', pagerduty: true }
  },
  {
    name: 'Database Connection Exhaustion',
    condition: 'db_connections_active / db_connections_max > 0.9',
    severity: 'critical',
    threshold: 0.9,
    duration: '1m',
    notification: { slack: '#alerts', pagerduty: true }
  },
  {
    name: 'High Error Rate',
    condition: 'error_rate > 0.05',
    severity: 'warning',
    threshold: 0.05,
    duration: '5m',
    notification: { slack: '#alerts', pagerduty: false }
  }
];
```

This comprehensive performance and scaling architecture ensures PLED can handle enterprise workloads while maintaining the deterministic execution guarantees essential for FSM-based workflow systems.