```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (React App)
    participant BE as Backend (Express js)
    participant DB as Supabase PostgreSQL

    %% Creating group in group community 
    User->>FE: Create Group
    activate FE
    FE->>BE: POST /api/groups/create (body: group_name, user_id)
    activate BE
    BE->>DB: INSERT INTO community_groups (group_name, created_by)
    DB->>BE: insert successful Returns *
    BE->>DB: INSERT INTO group_members (body: user_id, group_id)
    DB->>BE: insert successful
    BE->>FE: JSON Response (Status: 201)
    deactivate BE
    
    deactivate FE 
    FE->>User: Show success notifcation

    %% Joining group in group community
    User->>FE: Join Group
    activate FE
    FE->>BE: POST /api/groups/join (group_Id, user_id)
    activate BE
    Note over BE: Check group Id exists and that user is not in group
    BE->>DB: INSERT INTO group_members (body: user_id, group_id)
    DB->>BE: insert successful
    Note over BE: Send message that you enter the group 
    BE->>DB: INSERT INTO group_messages (body: group_id, sender_id, message_text)
    DB->>BE: insert successful
    BE->>FE: JSON Response (Status: 201)
    deactivate BE
    deactivate FE
    FE->>User: Joined successfully

    %%Selecting group chat in group community
    Note Over User: Select specific group chat room
    User->>FE: Send Message
    activate FE
    Note Over FE: add new message to group_messages
    FE->>BE: POST /api/groups/message (body: group_id, user_id, newMessage)
    activate BE
    BE->>DB: INSERT INTO group_messages (body: group_id, sender_id, message_text)
    DB->>BE: insert successful RETURN *
    BE->>FE: JSON Response (Status: 201)
    deactivate BE
    Note Over FE: fetch all of group messages
    FE->>BE: POST /api/groups/:groupId/messages
    activate BE
    BE->>DB: SELECT all of group messages FROM group_messages
    DB->>BE: Return all of group messages
    BE->>FE: Send messages
    deactivate BE
    
    deactivate FE
    FE->>User: Display group chat rooms messages

    

    

    
    
