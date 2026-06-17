```mermaid
sequenceDiagram
  Actor User
  Participant FE as Frontend (React App)
  Participant BE as Backend (Express js)
  Participant DB as supabase PostgreSQL

  
  User->>FE: click calculator
  FE->>User: calculator input form
  User->>FE: Enter calculator form details and calculate bill
  activate FE
  FE->>BE: POST api/bills/split_smart (body: input details/bill data)
  activate BE
  BE->>DB: INSERT INTO Bill (body: relevant bill data)
  DB->>BE: insert successful
  Note over BE: call a calculator logic function to split bills according to split method
  BE->>DB: INSERT INTO Bill_Shares (body: relevant bill data)
  DB->>BE: insert successful
  BE->>FE: JSON RESPONSE (status:201) 
  deactivate BE
  FE->>User: Smart split processed cleanly 
  deactivate FE 


