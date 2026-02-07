# Courier Assignment Sequence

```mermaid
sequenceDiagram
    participant App as Delivery Use Case
    participant Engine as Logistics Engine
    participant Repo as Courier Repository
    participant Policy as Assignment Policy
    participant Events as Event Publisher

    App->>Repo: findAvailableCouriers(location, radius)
    Repo-->>App: List<Courier>
    
    App->>Policy: selectBestCourier(couriers, deliveryDetails)
    Policy-->>App: selectedCourier
    
    App->>Repo: assignCourier(deliveryId, courierId)
    Repo-->>App: success
    
    App->>Events: publishCourierAssignedEvent(data)
```

## Flow Description

1. **Discovery**: The system searches for active couriers within a specified radius of the pickup point.
2. **Selection**: An assignment policy evaluates couriers based on rating, distance, and current load.
3. **Persistence**: The chosen courier is linked to the delivery in the database, and their availability is updated.
4. **Notification**: A domain event is broadcasted to inform other services (e.g., Notification Service).
