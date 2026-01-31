# User Authentication Use Case

```mermaid
useCaseDiagram
    actor "User" as U
    actor "Identity Provider" as IP
    
    package "Auth Service" {
        usecase "Login with Password" as UC1
        usecase "Verify 2FA" as UC2
        usecase "Refresh Token" as UC3
        usecase "Logout" as UC4
        usecase "Social Login" as UC5
    }
    
    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5
    UC5 -- IP
```
