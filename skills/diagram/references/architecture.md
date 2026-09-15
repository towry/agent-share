# Architecture Diagram Examples

## 1. Overview

Architecture diagrams show a system's building blocks and their interactions, helping engineers quickly understand the overall structure, responsibility boundaries, and data flow.
This document provides Mermaid examples of common architecture patterns that can be used directly or adapted.

---

## 2. Layered architecture

Each layer has a distinct responsibility, and dependencies flow downward rather than upward.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Web["Web App<br/>React / Vue"]
        Mobile["Mobile App<br/>iOS / Android"]
    end

    subgraph Gateway["Gateway level"]
        APIGW["API Gateway<br/>Kong / Nginx"]
        Auth["Auth Service<br/>OAuth 2.0"]
    end

    subgraph Service["Service level"]
        UserSvc["User Service"]
        OrderSvc["Order Service"]
        PaySvc["Payment Service"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL<br/>Primary"]
        Redis["Redis<br/>Cache"]
        S3["Object Storage<br/>S3"]
    end

    Web -->|HTTPS| APIGW
    Mobile -->|HTTPS| APIGW
    APIGW -->|JWT verify| Auth
    APIGW -->|gRPC| UserSvc
    APIGW -->|gRPC| OrderSvc
    APIGW -->|gRPC| PaySvc
    UserSvc -->|SQL| PG
    UserSvc -->|cache| Redis
    OrderSvc -->|SQL| PG
    PaySvc -->|SQL| PG
    OrderSvc -->|file| S3
```

---

## 3. Microservice architecture

In a microservice architecture, independently deployable services form the system, supported by message queues, service meshes, and service discovery.

```mermaid
flowchart LR
    Client["Client"] -->|HTTPS| LB["Load Balancer"]

    subgraph Mesh["Service Mesh / Istio"]
        direction TB
        CatalogSvc["Catalog Service"]
        CartSvc["Cart Service"]
        CheckoutSvc["Checkout Service"]
        NotifySvc["Notification Service"]
    end

    LB -->|route| CatalogSvc
    LB -->|route| CartSvc
    LB -->|route| CheckoutSvc

    subgraph MQ["Message Queue"]
        Kafka["Kafka"]
    end

    CheckoutSvc -->|publish order.created| Kafka
    Kafka -->|consume| NotifySvc

    subgraph Store["Data Stores"]
        MongoDB["MongoDB"]
        MySQL["MySQL"]
        ElasticSearch["ElasticSearch"]
    end

    CatalogSvc -->|read/write| MongoDB
    CatalogSvc -->|index| ElasticSearch
    CartSvc -->|read/write| MySQL
    CheckoutSvc -->|read/write| MySQL
```

---

## 4. Event-driven architecture

In an event-driven architecture, components communicate through events, enabling loose coupling and asynchronous processing.

```mermaid
flowchart TB
    subgraph Producers["Event producer"]
        WebHook["Webhook Receiver"]
        CronJob["Scheduled Job"]
        UserAction["User Action"]
    end

    subgraph Bus["Event Bus"]
        EventBridge["EventBridge<br/>SNS + SQS"]
    end

    subgraph Consumers["Event Consumer"]
        Indexer["Search Indexer"]
        Analytics["Analytics Pipeline"]
        Mailer["Email Service"]
        Auditor["Audit Logger"]
    end

    subgraph Sink["Data Sink"]
        ES["ElasticSearch"]
        DW["Data Warehouse"]
        MailProvider["SMTP Provider"]
        AuditDB["Audit DB"]
    end

    WebHook -->|event.received| EventBridge
    CronJob -->|event.scheduled| EventBridge
    UserAction -->|event.user| EventBridge

    EventBridge -->|subscribe| Indexer
    EventBridge -->|subscribe| Analytics
    EventBridge -->|subscribe| Mailer
    EventBridge -->|subscribe| Auditor

    Indexer -->|write| ES
    Analytics -->|ETL| DW
    Mailer -->|send| MailProvider
    Auditor -->|append| AuditDB
```

---

## 5. Deployment topology

A deployment diagram shows the physical and logical layout of infrastructure, including regions, clusters, and load balancers.

```mermaid
flowchart TB
    DNS["DNS<br/>Route 53"] -->|resolve| CDN["CDN<br/>CloudFront"]
    CDN -->|origin| GLB["Global LB"]

    subgraph RegionA["Region: us-east-1"]
        subgraph K8sA["K8s Cluster A"]
            IngressA["Ingress Controller"]
            PodA1["Pod: API x3"]
            PodA2["Pod: Worker x2"]
        end
        RDS_A["RDS Primary"]
        ElastiCache_A["ElastiCache"]
    end

    subgraph RegionB["Region: eu-west-1"]
        subgraph K8sB["K8s Cluster B"]
            IngressB["Ingress Controller"]
            PodB1["Pod: API x3"]
            PodB2["Pod: Worker x2"]
        end
        RDS_B["RDS Replica"]
        ElastiCache_B["ElastiCache"]
    end

    GLB -->|route| IngressA
    GLB -->|route| IngressB
    IngressA --> PodA1
    IngressA --> PodA2
    IngressB --> PodB1
    IngressB --> PodB2
    PodA1 -->|SQL| RDS_A
    PodA1 -->|cache| ElastiCache_A
    PodB1 -->|SQL| RDS_B
    PodB1 -->|cache| ElastiCache_B
    RDS_A -->|replication| RDS_B
```
