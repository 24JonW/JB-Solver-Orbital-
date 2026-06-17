```mermaid
sequenceDiagram
    autonumber
    actor User as Baker
    participant FE as Frontend App
    participant BE as Express Backend
    participant DB as Supabase DB

    User->>FE: Clicks "Save Log"
    FE->>BE: POST /api/logs (data & notes)
    Note over BE: Validate User Session
    BE->>DB: INSERT INTO baking_history
    DB-->>BE: 201 Created Success
    BE-->>FE: JSON Response (Success)
    FE->>User: Show "Bake Logged Successfully!"
