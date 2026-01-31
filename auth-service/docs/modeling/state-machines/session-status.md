# User Session State Machine

```mermaid
stateDiagram-v2
    [*] --> UNAUTHENTICATED
    UNAUTHENTICATED --> CHALLENGED : login()
    CHALLENGED --> AUTHENTICATED : verify2FA()
    CHALLENGED --> UNAUTHENTICATED : retryLimitExceeded()
    AUTHENTICATED --> REFRESHING : expired()
    REFRESHING --> AUTHENTICATED : success()
    REFRESHING --> UNAUTHENTICATED : failure()
    AUTHENTICATED --> UNAUTHENTICATED : logout()
    
    state AUTHENTICATED {
        [*] --> ActiveSession
        ActiveSession --> Locked : unusualActivity()
        Locked --> ActiveSession : adminUnlock()
    }
```
