# Container Resource Tuning Guide

## Overview
This guide provides instructions for monitoring and tuning container resource requests and limits for the Maysar application. Proper tuning ensures reliability, cost-efficiency, and conformance to the **1:5 Resource Ratio** mandate.

## Constitutional Mandates
According to **Section 4.2 Resource Stewardship**:
- **Requests** are guaranteed resources.
- **Limits** are hard caps.
- **Burstable Ratio**: Limits should typically not exceed 5x the request to prevent noisy neighbor issues.

## Monitoring Strategy
Use Prometheus and Grafana to monitor the following metrics:
- `container_cpu_usage_seconds_total`: Rate of CPU usage.
- `container_memory_working_set_bytes`: Active memory usage (triggers OOM kills if limit reached).
- `container_resource_limits`: Configured limits.

## Tuning Procedure

### 1. Establish Baseline
Run the application under normal load for 24 hours. Record the 95th percentile (P95) and maximum usage.

### 2. Set Requests
Set `requests` slightly above the average usage to ensure the scheduler places pods on nodes with sufficient capacity.
- **CPU Request** ~= Average Usage + 10-20% buffer
- **Memory Request** ~= Average Use + 20% buffer

### 3. Set Limits
Set `limits` to handle spikes without compromising stability.
- **CPU Limit**: 2x - 5x the Request (Do not exceed 5x).
  - *Example*: Request 200m -> Limit 1000m.
- **Memory Limit**: 1.2x - 2x the Maximum Observed Usage (P100).
  - *Critical*: OOM Kills result in immediate restart. Set memory limits conservatively high.

### 4. Continuous Refinement
- **If Throttling (CPU)**: Increase Limit if usage is spiky; Increase Request if consistently high.
- **If OOM Killed**: Immediately increase Memory Limit and investigate for leaks.
- **If Underutilized**: Reduce Requests to save cluster capacity.

## Recommended Values (Initial)

| Service | CPU Req | CPU Lim | Mem Req | Mem Lim | Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API Gateway | 200m | 1000m | 128Mi | 512Mi | 1:5 |
| Microservices | 100m | 500m | 128Mi | 384Mi | 1:5 |
| Worker Jobs | 500m | 2000m | 256Mi | 1Gi | 1:4 |

## Troubleshooting
- **Pod Pending**: Use `deployctl describe pod` to check if nodes lack sufficient resources for the Requests.
- **CrashLoopBackOff**: Check for OOM Kills (`deployctl get pod -o yaml | grep reason: OOMKilled`).
