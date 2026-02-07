# SMS Service - Modeling Documentation

This directory contains Mermaid diagrams documenting the SMS service's message delivery workflows and state transitions.

## Directory Structure

- **state-machines/** - Message delivery state machines
- **sequence/** - Message dispatch sequence diagrams
- **use-cases/** - Notification dispatch use cases

## State Machines

### [sms-delivery-status.mmd](state-machines/sms-delivery-status.mmd)
Lifecycle of an SMS message from QUEUED through dispatch (SENDING, SENT) to final delivery states (DELIVERED/UNDELIVERED), including retry logic for failures.

## Sequence Diagrams

###[sms-dispatch-flow.mmd](sequence/sms-dispatch-flow.mmd)
Orchestration of SMS dispatch: queuing, provider dispatch, delivery tracking, retry handling, and event publishing.

## Use Cases

### [notification-dispatch.mmd](use-cases/notification-dispatch.mmd)
High-level operations for SMS notification dispatch including sending, tracking, retry management, and provider configuration.

## Service Classification

**Type:** Infrastructure Service (Stateless with Message Tracking)

The SMS service is primarily a stateless utility for message dispatch, but includes delivery state tracking via a lightweight entity (SMS delivery status). Unlike domain-heavy services, it does not have complex saga orchestrations or rich domain entities.

## Alignment with Code

All diagrams reflect the actual implementation in:
- `src/domain/` - Message delivery state machine
- `src/application/` - Dispatch and tracking workflows
- `src/infrastructure/providers/` - SMS provider integrations

Last Updated: 2026-02-07
