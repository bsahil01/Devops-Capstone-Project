# Cloud-Native Employee Management System
### Capstone Project: End-to-End DevOps Pipeline for Cloud-Native Application Deployment
**Course:** DevOps & Automation Lab (ENSP461) | **B. Tech CSE — Semester VII**

---

## 📌 Project Overview & Problem Statement

Modern software engineering organizations require applications to be delivered rapidly, securely, and reliably. Manual deployment processes are slow, error-prone, and difficult to scale. This project implements an automated, cloud-native DevOps workflow for an enterprise-grade **Employee Management System (EMS)**.

### Scope of Implementation (Phases 1 to 3)
1. **Phase 1: Version Control (Git)**:
   - Branching model (`main`, `develop`, feature branches).
   - Conventional commit methodology with distinct, meaningful commit chunks.
   - Traceable commit history and branch merge verification.
2. **Phase 2: Continuous Integration (Jenkins)**:
   - **Automatic Build**: Dependency resolution and environment verification.
   - **Automatic Testing**: Comprehensive unit and integration test suite executing via Node test runner.
   - **Automatic Packaging**: Production bundle script creating timestamped tarball releases with SHA-256 checksums.
   - **Automated Triggers**: Configured for GitHub Webhooks (`githubPush()`) and SCM polling.
   - Also includes GitHub Actions CI (`.github/workflows/ci.yml`) for dual-cloud CI/CD automation.
3. **Phase 3: Containerization (Docker & Docker Compose)**:
   - **Multi-Stage Dockerfile**: Builder stage for lean production footprint (~66 MB), unprivileged `node` security user, layer caching, and built-in HTTP healthchecks.
   - **Docker Compose Orchestration**: Multi-container setup tying together the Node.js application and a persistent PostgreSQL 16 database with health check dependencies and bridge networking.

---

## 🏗️ Architecture & Technology Stack

```
                                  +---------------------------------------+
                                  |         Git Version Control           |
                                  |     (main, develop, feature-branches) |
                                  +-------------------+-------------------+
                                                      |
                                           [ Git Push / Webhook ]
                                                      v
                                  +---------------------------------------+
                                  |        Jenkins / GitHub Actions       |
                                  |  - Automatic Build                    |
                                  |  - Automated Unit & Integration Tests |
                                  |  - Production Packaging (tar.gz)      |
                                  |  - Docker Container Build             |
                                  +-------------------+-------------------+
                                                      |
                                          [ Deploy via Containers ]
                                                      v
                        +-----------------------------------------------------------+
                        |             Docker Compose Virtual Network                |
                        |                                                           |
                        |   +---------------------+       +---------------------+   |
                        |   |  Node.js App (EMS)  | ----> |  PostgreSQL 16 DB   |   |
                        |   |  Port: 3000         |       |  Port: 5432         |   |
                        |   |  (Healthcheck UP)   |       |  (Persistent Volume)|   |
                        |   +---------------------+       +---------------------+   |
                        +-----------------------------------------------------------+
```

| Layer | Technology |
|---|---|
| **Backend Runtime** | Node.js (v20+ / v22+) & Express |
| **Frontend UI** | HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Dark UI), Client-side Vanilla JS |
| **Databases** | PostgreSQL 16 (in Docker Compose / Production), SQLite (Local zero-config fallback) |
| **Authentication** | JWT (JSON Web Tokens) with `bcryptjs` password hashing and role-based access control |
| **CI / Automation** | Jenkins Declarative Pipeline (`Jenkinsfile`) & GitHub Actions (`.github/workflows/ci.yml`) |
| **Containerization** | Docker (Multi-stage build) & Docker Compose |

---

## 🚀 Functional Features

- **User Authentication & Roles**:
  - Secure registration and login using JWT and hashed passwords.
  - Role-based permissions (`admin`, `manager`, `employee`).
  - Pre-seeded credentials for immediate evaluation.
- **Full Employee CRUD Operations**:
  - **Create**: Add employees with validation (name, email, department, role, salary, hire date).
  - **Read**: Dynamic search by name/email, filtering by department/status, and multi-field sorting.
  - **Update**: Modal-based editing of employee records with instant UI updates.
  - **Delete**: Safe deletion workflow with modal confirmation.
- **Dashboard Metrics & Analytics**:
  - Real-time counters: Total Employees, Active Staff, Average Salary, Monthly Payroll.
- **Reliability & Health Probes**:
  - Endpoint `/api/health` reporting system uptime, database status, memory usage, and CPU count.

---

## 🔑 Demo Credentials

| Role | Username | Email | Password |
|---|---|---|---|
| **Administrator** | `admin` | `admin@techcorp.io` | `AdminPassword123!` |
| **Manager** | `manager` | `manager@techcorp.io` | `ManagerPassword123!` |
| **Employee** | `developer` | `dev@techcorp.io` | `DevPassword123!` |

---

## 🛠️ Step-by-Step Quickstart Guide

### Option 1: Run Completely in Docker (Recommended - Phase 3)

Ensure Docker Desktop or Docker engine is running, then execute:

```bash
# Build images and start both App and PostgreSQL containers
docker compose up -d

# Check running services and health status
docker compose ps

# View live application logs
docker compose logs -f app

# Test health check endpoint
curl http://localhost:3000/api/health
```

Open your browser at **`http://localhost:3000`** to access the web application.

To stop the containers:
```bash
docker compose down
```

---

### Option 2: Local Development Run (Zero External Dependencies)

The application includes an automated fallback to SQLite for local development:

```bash
# 1. Install dependencies
npm install

# 2. Seed initial demo employees and user accounts
npm run seed

# 3. Run automated tests
npm test

# 4. Package production release tarball
npm run package

# 5. Start the server
npm start
# or for auto-reloading:
npm run dev
```

---

## 🧪 Testing & Verification

The automated test suite covers unit validation, REST API integration, authentication, and error handling:

```bash
npm test
```

Test Results Breakdown:
- **Unit Tests**: Form input validation, email regular expressions, salary bounds, password complexity.
- **Authentication Integration**: Registration, duplicate rejection, login verification, token decoding, unauthorized access rejection.
- **Employee CRUD Integration**: Full lifecycle testing (Create $\to$ Read $\to$ Update $\to$ Delete $\to$ 404 verification).
- **System Health Integration**: `/api/health` response validation and 404 routing verification.

---

## 📦 CI/CD Pipeline (Jenkins & GitHub Actions)

The `Jenkinsfile` implements a declarative pipeline with the following stages:

1. **Checkout SCM**: Checks out the code from Git and displays commit metadata.
2. **Environment Check**: Verifies Node.js, npm, and Docker toolchains.
3. **Automatic Build**: Executes `npm ci` to produce clean, reproducible builds.
4. **Automatic Testing**: Runs `npm test` verifying all test suites pass.
5. **Automatic Packaging**: Executes `npm run package` to create `dist/employee-management-app-v1.0.0-<timestamp>.tar.gz` and calculates its SHA-256 checksum.
6. **Docker Image Build**: Builds `employee-management-app:${BUILD_NUMBER}` using the multi-stage Dockerfile.
7. **Container Smoke Test**: Spawns the container, verifies the `/api/health` endpoint responds with HTTP 200, and cleans up the container.
8. **Post-Build Actions**: Archives release tarballs and logs build status.

---

## 📜 Commit History & Git Workflow

The project follows Conventional Commits executed in discrete chunks:

```bash
git log --oneline --graph --all
```

Commit Chunks:
1. `chore: initialize repository and project structure`
2. `feat(api): implement database layer and employee CRUD REST APIs`
3. `feat(auth): implement user authentication and authorization with JWT`
4. `feat(ui): implement responsive dashboard and web interface`
5. `test: add automated unit and API integration tests`
6. `ci: add Jenkinsfile and GitHub Actions pipeline for automated build, test and package`
7. `docker: add multi-stage Dockerfile and docker-compose configuration`
8. `docs: add comprehensive README with setup, architecture, and lab documentation`
