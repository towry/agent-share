# Class and ER Diagram Reference

## Class diagram overview

Class diagrams (`classDiagram`) represent **object structures, inheritance relationships, and interface contracts**. Use a class diagram for:

- Domain model design that shows relationships between entities
- Inheritance hierarchies between interfaces and implementations
- Structural descriptions of design patterns
- Fields and methods in API data models

Relationship symbols:

| Symbol | Meaning |
|------|------|
| `<\|--` | Inheritance |
| `*--` | Composition |
| `o--` | Aggregation |
| `-->` | Association |
| `..>` | Dependency |
| `..\|>` | Realization |

---

## Domain model

Core models in an e-commerce domain—User, Order, Product, and Payment—and their relationships.

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +List~Address~ addresses
        +register() void
        +login() Session
    }

    class Order {
        +String id
        +OrderStatus status
        +DateTime createdAt
        +Decimal totalAmount
        +place() void
        +cancel() void
        +calculateTotal() Decimal
    }

    class Product {
        +String id
        +String name
        +Decimal price
        +Int stock
        +Category category
        +deductStock(qty) void
        +isAvailable() bool
    }

    class OrderItem {
        +String id
        +Int quantity
        +Decimal unitPrice
        +subtotal() Decimal
    }

    class Payment {
        +String id
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +process() bool
        +refund() bool
    }

    class Address {
        +String street
        +String city
        +String zipCode
    }

    class OrderStatus {
        <<enumeration>>
        PENDING
        PAID
        SHIPPED
        DELIVERED
        CANCELLED
    }

    class PaymentMethod {
        <<enumeration>>
        CREDIT_CARD
        ALIPAY
        WECHAT_PAY
    }

    User "1" --> "*" Order : places
    User "1" *-- "*" Address : has
    Order "1" *-- "1..*" OrderItem : contains
    OrderItem "*" --> "1" Product : references
    Order "1" --> "1" Payment : settles
```

Key points:
- `<<enumeration>>` identifies an enumeration type.
- Enclose generic type parameters in `~`, as in `List~Address~`.
- Label both ends of a relationship with cardinalities such as `"1"`, `"*"`, and `"1..*"`.
- Include return types on methods and data types on fields.

---

## ER diagram overview

ER diagrams (`erDiagram`) represent **database table structures and relationships between tables**. Use an ER diagram for:

- Database schema design and review
- Visualization of foreign-key relationships
- Structural comparisons of data migration plans

Cardinality symbols:

| Symbol | Meaning |
|------|------|
| `\|\|` | Exactly one |
| `o\|` | Zero or one |
| `}o` | Zero or more |
| `}\|` | One or more |

---

## Database Schema

An e-commerce database schema showing table structures and foreign-key relationships.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        timestamp created_at
        timestamp updated_at
    }

    ADDRESSES {
        uuid id PK
        uuid user_id FK
        varchar street
        varchar city
        varchar zip_code
        boolean is_default
    }

    PRODUCTS {
        uuid id PK
        varchar name
        text description
        decimal price
        int stock
        uuid category_id FK
        timestamp created_at
    }

    CATEGORIES {
        uuid id PK
        varchar name
        uuid parent_id FK
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        varchar status
        decimal total_amount
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK
        decimal amount
        varchar method
        varchar status
        timestamp paid_at
    }

    USERS ||--o{ ADDRESSES : "has"
    USERS ||--o{ ORDERS : "places"
    ORDERS ||--|{ ORDER_ITEMS : "contains"
    ORDER_ITEMS }o--|| PRODUCTS : "references"
    PRODUCTS }o--|| CATEGORIES : "belongs to"
    CATEGORIES o|--o{ CATEGORIES : "parent of"
    ORDERS ||--o| PAYMENTS : "settles"
```

Key points:
- Label fields with their types and constraints (`PK`, `FK`, `UK`).
- Express cardinality with symbol pairs; for example, `||--o{` means one to zero-or-more.
- Express self-referential relationships, such as parent-child categories, with the same table at both ends.
- Enclose relationship labels in quotation marks and keep them concise.
