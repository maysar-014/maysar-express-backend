# Dashboard Analytics Use Case

```mermaid
useCaseDiagram
    actor "Seller" as S
    actor "Enabler" as E
    actor "Courier" as C
    actor "Administrator" as A
    actor "System Event" as SE
    
    package "Analytics Service" {
        usecase "View Seller Dashboard" as UC1
        usecase "View Enabler Analytics" as UC2
        usecase "View Courier Performance" as UC3
        usecase "Process Operational Event" as UC4
        usecase "Generate Metrics" as UC5
        usecase "Generate Insights" as UC6
    }
    
    S --> UC1
    E --> UC2
    C --> UC3
    A --> UC1
    A --> UC2
    A --> UC3
    
    SE --> UC4
    UC4 ..> UC5 : <<include>>
    UC5 ..> UC6 : <<extend>>
```
