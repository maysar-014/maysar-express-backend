# Product Management Use Case

```mermaid
useCaseDiagram
    actor "Seller" as S
    actor "Customer" as C
    actor "Administrator" as A
    
    package "Catalog Service" {
        usecase "Create Product Draft" as UC1
        usecase "Upload Product Media" as UC2
        usecase "Publish Product" as UC3
        usecase "Search Products" as UC4
        usecase "Update Pricing" as UC5
        usecase "Bulk Update Products" as UC6
    }
    
    S --> UC1
    S --> UC2
    S --> UC3
    S --> UC5
    S --> UC6
    C --> UC4
    A --> UC3
    A --> UC5
```
