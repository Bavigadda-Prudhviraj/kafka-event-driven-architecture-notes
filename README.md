# 🚀 Kafka & Event-Driven Architecture Notes

A comprehensive learning resource to understand **Event-Driven Architecture (EDA)** and **Apache Kafka**, starting from fundamentals and progressing to advanced concepts.

This project brings together structured technical notes, architecture explanations, diagrams, practical examples, and interview preparation material to help developers build a strong understanding of Kafka and distributed event-driven systems.

---

## 📚 What You Will Learn

### 1. Event-Driven Architecture (EDA)
- Introduction to Event-Driven Architecture
- Understanding Event-Driven Systems
- Producers, Consumers, and Event Brokers
- Event Routers and Message Communication
- Event-Based Communication Patterns

### 2. Kafka Architecture
- Kafka Architecture Fundamentals
- Kafka Brokers and Clusters
- Topics, Partitions, and Segments
- Leader and Follower Replication
- Controller and Broker Responsibilities
- Kafka Architecture Internals

### 3. Kafka Cluster Setup
- Kafka Cluster Configuration
- Broker Setup
- Controller Setup
- Multi-Broker Architecture
- Multi-Controller Architecture
- Complete Cluster Setup

### 4. Kafka Producer
- Kafka Producer Setup
- Producer Internal Architecture
- Serialization and Partitioning
- Batching and Compression
- Producer Threading Model
- Producer Configurations
- Producer Performance Considerations

### 5. Kafka Producer Idempotency
- Understanding Idempotency
- Producer ID (PID)
- Sequence Numbers
- Duplicate Message Prevention
- Idempotent Producer Internals

### 6. Kafka Consumer
- Kafka Consumer Setup
- Consumer Groups
- Multi-Topic and Multi-Consumer Patterns
- Partition Assignment
- Consumer Offset Management
- Consumer Exception Handling
- Retry Mechanisms
- Dead Letter Topic (DLT)
- Advanced Consumer Configurations

### 7. Kafka Transactions

**Producer Transactions**
- Transaction Coordinator
- Producer ID and Epoch
- Zombie Fencing
- Two-Phase Commit (2PC)
- Transaction Handling

**Consumer Transactions**
- End Offset and Last Stable Offset
- Read Committed Isolation
- Exactly-Once Semantics
- Abort Handling

### 8. Schema Registry
- Introduction to Schema Registry
- Why Schema Registry Is Required
- Avro Serialization
- Schema Evolution
- Schema Compatibility

### 9. Outbox Pattern
- Understanding the Dual-Write Problem
- Outbox Pattern Architecture
- Polling Strategy
- CDC (Change Data Capture)
- Debezium Integration
- Reliable Event Publishing

### 10. Kafka Streams
- Introduction to Kafka Streams
- Problems Solved by Kafka Streams
- Kafka Streams Architecture
- Topology and Sub-Topology
- Tasks and Processing Model
- Kafka Streams Setup

### 11. KStream, KTable & GlobalKTable
- Understanding KStream
- Understanding KTable
- Understanding GlobalKTable
- Differences and Use Cases

### 12. Kafka Streams SerDes
- Serialization
- Deserialization
- Serializers and Deserializers
- Custom SerDes
- Error Handling

### 13. Kafka Streams Stateless Processing
- Stateless Processing Nodes
- Filter
- Map
- FlatMap
- Branch
- Stateless Transformations

### 14. Kafka Streams Stateful Processing
- Stateful Processing Nodes
- GroupBy
- Count
- Aggregate
- Reduce
- State Stores
- Windowed Aggregations

### 15. Kafka Streams Windowing
- Tumbling Windows
- Hopping Windows
- Session Windows
- Windowed Aggregations
- Real-Time Stream Processing

---

## 🗺️ Recommended Learning Roadmap

Follow this learning sequence to build your knowledge progressively:

1. Understand Event-Driven Architecture.
2. Learn Kafka architecture and cluster fundamentals.
3. Explore producer internals and configurations.
4. Understand consumer groups and message processing.
5. Master idempotency and transaction handling.
6. Learn Schema Registry and Avro.
7. Understand the Outbox Pattern and CDC.
8. Explore Kafka Streams and real-time processing.

---

## 💼 Real-World Engineering Concepts

Understand how Kafka concepts are applied in production systems:

- Reliable event publishing
- Distributed messaging
- Fault tolerance and replication
- Message ordering and delivery guarantees
- Duplicate message prevention
- Retry and Dead Letter Topic strategies
- Exactly-once processing
- Real-time stream processing
- Event-driven microservices communication
- Distributed transaction challenges

---

## 📋 Prerequisites

Basic knowledge of the following concepts will be helpful:

- Java fundamentals
- Object-Oriented Programming
- Spring Boot basics
- REST APIs
- SQL and database fundamentals
- Basic understanding of distributed systems

You can still explore the foundational topics without advanced knowledge of these subjects.

---

## 🎯 Learning Objectives

By completing these topics, you will develop an understanding of:

- How Event-Driven Architecture works.
- How Kafka manages distributed messaging.
- How producers publish and consumers process messages.
- How Kafka handles failures, retries, and duplicate messages.
- How Kafka transactions provide reliable message processing.
- How Schema Registry manages message schemas.
- How the Outbox Pattern solves distributed transaction challenges.
- How Kafka Streams supports real-time data processing.

---

## 👨‍💻 Who Should Use These Notes?

- Java Backend Developers
- Spring Boot Developers
- Data Engineers
- Software Engineers
- Developers preparing for Kafka interviews
- Engineers interested in Distributed Systems and System Design

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript

---

## 🎓 Learning Resource & Acknowledgement

These notes are organized alongside the following video course:

**Event Driven Architecture (with Kafka) – From Basics to Advanced**

[▶ Watch the Complete YouTube Playlist](https://www.youtube.com/playlist?list=PL6W8uoQQ2c62YCR2kkE-0tg3-y1QwaIWk)

Thanks to the course creator for providing the learning resource that supports this study journey.

---

## 🎯 Project Goals

The goal of this project is to create a structured learning and revision platform that helps developers:

- Understand Kafka concepts beyond definitions.
- Learn internal architecture and implementation details.
- Connect theoretical concepts with practical scenarios.
- Prepare for backend engineering interviews.
- Build confidence in designing event-driven applications.

---

## 💬 Feedback & Contributions

Suggestions, corrections, and improvements are welcome.

If you find an issue or have an idea to improve the learning material, feel free to share your feedback through GitHub Issues.

---

## 👨‍💻 Author

**Bavigadda Prudhviraj**

- 📧 Email: [prudhviraj729@gmail.com](mailto:prudhviraj729@gmail.com)
- 🐙 GitHub: [Bavigadda-Prudhviraj](https://github.com/Bavigadda-Prudhviraj)

---

⭐ If you find this learning resource useful, consider giving this repository a star.

**Learn. Understand. Build. Master Kafka.**