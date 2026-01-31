# Business Onboarding Use Case

```mermaid
useCaseDiagram
    actor "Business Owner" as BO
    actor "Compliance Officer" as CO
    actor "System" as S
    
    package "Business Registry Service" {
        usecase "Register Business" as UC1
        usecase "Upload Documents" as UC2
        usecase "Verify Business" as UC3
        usecase "Suspend Business" as UC4
        usecase "Reactivate Business" as UC5
    }
    
    BO --> UC1
    BO --> UC2
    CO --> UC3
    CO --> UC4
    CO --> UC5
    S --> UC3
```
