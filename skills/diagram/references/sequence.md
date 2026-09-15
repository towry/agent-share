# Sequence Diagram Reference

## Overview

A sequence diagram shows the order of messages exchanged between participants. Use one for:

- Synchronous or asynchronous calls between services
- Authentication and authorization flows
- Error and retry paths
- Event-driven message delivery

## Basic call

The simplest synchronous request-response pattern.

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: GET /users/42
    activate API
    API->>DB: SELECT * FROM users WHERE id=42
    activate DB
    DB-->>API: Row data
    deactivate DB
    API-->>Client: 200 OK (JSON)
    deactivate API
```

## Authentication process

An OAuth2 authorization code flow involving multiple participants.

```mermaid
sequenceDiagram
    actor User
    participant App
    participant AuthServer
    participant ResourceAPI

    User->>App: Click "Login"
    App->>AuthServer: GET /authorize?response_type=code
    AuthServer->>User: Show login page
    User->>AuthServer: Submit credentials
    AuthServer-->>App: 302 redirect with code

    App->>AuthServer: POST /token (code + client_secret)
    activate AuthServer
    AuthServer-->>App: access_token + refresh_token
    deactivate AuthServer

    App->>ResourceAPI: GET /profile (Bearer token)
    activate ResourceAPI

    alt Token valid
        ResourceAPI-->>App: 200 OK (user profile)
    else Token expired
        ResourceAPI-->>App: 401 Unauthorized
        App->>AuthServer: POST /token (refresh_token)
        AuthServer-->>App: New access_token
        App->>ResourceAPI: GET /profile (new token)
        ResourceAPI-->>App: 200 OK (user profile)
    end

    deactivate ResourceAPI
    App->>User: Show profile page
```

## Asynchronous messages

An asynchronous flow decoupled through a message queue, including callback notifications.

```mermaid
sequenceDiagram
    participant Producer
    participant Queue
    participant Worker
    participant Callback

    Producer->>Queue: Publish order.created event
    activate Queue
    Note right of Queue: Message persisted

    Queue-)Worker: Deliver message (async)
    deactivate Queue
    activate Worker

    loop Retry up to 3 times
        Worker->>Worker: Process order
    end

    par Notify downstream
        Worker-)Callback: POST /webhook (order.completed)
    and Update state
        Worker-)Queue: Publish order.processed event
    end

    deactivate Worker

    activate Callback
    Callback-->>Worker: 200 ACK
    deactivate Callback
```

## Error handling

Use `alt` and `opt` blocks to represent normal and error branches.

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Service
    participant DB

    Client->>Gateway: POST /orders
    activate Gateway

    Gateway->>Service: Validate & create order
    activate Service

    alt Validation failed
        Service-->>Gateway: 400 Bad Request
        Gateway-->>Client: 400 (error detail)
    else Validation passed
        Service->>DB: INSERT INTO orders
        activate DB

        alt DB write success
            DB-->>Service: OK
            deactivate DB
            Service-->>Gateway: 201 Created
            Gateway-->>Client: 201 (order_id)
        else DB error
            DB-->>Service: Error
            Note over Service: Log error, rollback
            Service-->>Gateway: 503 Service Unavailable
            Gateway-->>Client: 503 (retry later)
        end
    end

    deactivate Service
    deactivate Gateway

    opt Client retries on 503
        Client->>Gateway: POST /orders (retry)
        Gateway-->>Client: 201 Created
    end
```
