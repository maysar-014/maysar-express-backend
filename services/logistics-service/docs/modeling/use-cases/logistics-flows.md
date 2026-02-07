# Logistics Service Use Cases

## Delivery Orchestration

```mermaid
useCaseDiagram
    actor "Customer" as C
    actor "Courier" as Cr
    actor "System" as S

    package "Logistics Service" {
        usecase "Create Delivery" as UC1
        usecase "Assign Courier" as UC2
        usecase "Track Progress" as UC3
        usecase "Update Status" as UC4
        usecase "Calculate Earnings" as UC5
    }

    C --> UC1
    UC1 ..> UC2 : include
    UC2 --> Cr
    Cr --> UC4
    UC4 ..> UC3 : extend
    UC4 ..> UC5 : include
    S --> UC5
```

## Description

1. **Create Delivery**: Triggered by an order placement. Initiates the logistics flow.
2. **Assign Courier**: Automated or manual assignment of an available courier based on proximity and capacity.
3. **Track Progress**: Real-time monitoring of courier location and delivery status.
4. **Update Status**: Couriers update the state of the delivery (Picked Up, In Transit, Delivered).
5. **Calculate Earnings**: Final calculation of courier fees and platform commission upon completion.
