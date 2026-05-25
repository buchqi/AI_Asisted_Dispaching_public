# Phase 1-4 Backend Explanation

## 1. Big Picture

This backend is the foundation for an AI-Assisted Dispatching MVP. It uses FastAPI for the API, PostgreSQL for permanent data storage, SQLAlchemy for working with the database from Python, Alembic for database migrations, and JWT authentication for protected routes.

The main request flow is:

```text
API routes -> Schemas -> Services -> Models -> DB Session -> PostgreSQL
```

Each layer has a specific job:

- API routes receive HTTP requests and return HTTP responses.
- Schemas validate incoming request data and shape outgoing response data.
- Services contain business logic, such as registering a user or checking a password.
- Models describe database tables as Python classes.
- DB Session manages communication between the application and PostgreSQL.
- PostgreSQL stores the actual application data.

Core utilities support the whole backend. For example, `app/core/config.py` loads environment variables, and `app/core/security.py` handles password hashing and JWT tokens.

Alembic is separate from normal API request handling. Its job is to change the database structure over time. When models change, Alembic migrations are created and applied so PostgreSQL matches the application models.

## 2. Folder Responsibilities

`app/api`

This folder contains API-related code. It is where FastAPI dependencies and route modules live.

`app/api/deps.py`

This file contains reusable FastAPI dependencies. The most important current dependency is `get_current_user()`, which protects routes by reading a JWT token, decoding it, and loading the authenticated user from the database.

`app/api/v1`

This folder contains versioned API routes. Versioning keeps the API organized and makes future API changes easier. Current authentication routes live in `app/api/v1/auth.py`.

`app/core`

This folder contains shared application utilities and configuration. Examples include environment configuration, password hashing, JWT creation, JWT decoding, constants, and future permission helpers.

`app/db`

This folder contains database connection setup. It defines the SQLAlchemy engine, session factory, request-scoped database sessions, and the shared `Base` class for models.

`app/models`

This folder contains SQLAlchemy models. Models are Python classes that describe database tables, columns, foreign keys, and relationships.

`app/schemas`

This folder contains Pydantic schemas. Schemas define what the API accepts and what the API returns. They also help prevent sensitive fields, such as `hashed_password`, from being returned to clients.

`app/services`

This folder contains business logic. Services keep route files thin and reusable. For example, authentication logic lives in `app/services/auth_service.py`.

`alembic`

This folder contains migration setup and migration versions. Alembic uses this folder to track and apply database structure changes.

`docs`

This folder contains project documentation, planning notes, API notes, database notes, and backend explanations like this file.

`tests`

This folder contains automated tests. Tests help confirm that backend behavior still works as the project grows.

## 3. Phase 1 Explanation

Phase 1 created the basic repository and backend project structure.

`Backend`

The backend folder separates API/server code from the rest of the project documentation and future frontend or tooling work. It is the main home for the FastAPI application.

`app/main.py`

This is the FastAPI entry point. It creates the FastAPI app, defines app metadata like title and version, registers routes, and exposes the health check endpoint.

`GET /health`

The health check endpoint confirms that the backend is running. This is useful during local development, deployment, and server monitoring.

Example response:

```json
{
  "status": "ok",
  "message": "AI-Assisted Dispatching backend is running"
}
```

`requirements.txt`

This file lists Python dependencies needed by the backend, such as FastAPI, Uvicorn, SQLAlchemy, Alembic, PostgreSQL drivers, JWT utilities, and password hashing libraries.

`.env.example`

This file documents the environment variables the backend expects. It acts as a safe template for developers without exposing real secrets.

`docs`

The documentation folder stores design notes and project explanations. This is important because backend systems become easier to maintain when the reasoning is written down, not only hidden in code.

## 4. Phase 2 Explanation

Phase 2 connected the backend to PostgreSQL and added database migration support.

PostgreSQL is the database used to store application data permanently. Users, companies, memberships, trucks, drivers, loads, and future dispatching records will live in PostgreSQL tables.

`.env DATABASE_URL`

The database URL tells the backend how to connect to PostgreSQL. It usually includes the database type, username, password, host, port, and database name.

Example shape:

```text
postgresql://username:password@localhost:5432/database_name
```

`app/core/config.py`

This file loads environment variables into a central settings object. Instead of hardcoding values like database URLs or secret keys, the app reads them from the environment.

`app/db/database.py`

This file creates the SQLAlchemy database engine and `SessionLocal`.

The engine is the main SQLAlchemy connection object. It knows how to connect to PostgreSQL.

`SessionLocal` is a session factory. It creates database sessions that the application uses to query, insert, update, and delete data.

`app/db/session.py`

This file defines `get_db()`, a FastAPI dependency that creates one database session for a request and closes it when the request finishes.

The lifecycle is:

```text
request starts -> open DB session -> endpoint/service uses DB -> request ends -> close DB session
```

This prevents database connections from staying open forever.

`app/db/base.py`

This file defines `Base`, the parent class for all SQLAlchemy models. Every model inherits from `Base`, and SQLAlchemy uses `Base.metadata` to understand all registered tables.

SQLAlchemy engine

The engine connects Python code to PostgreSQL.

SessionLocal

`SessionLocal` creates database sessions. A session is the active conversation between the backend and the database during a request.

get_db()

`get_db()` gives routes and services access to a database session through FastAPI dependency injection.

Base

`Base` is the shared parent class for models. It allows SQLAlchemy and Alembic to discover table definitions.

Alembic setup

Alembic manages database structure changes. Instead of manually creating tables in PostgreSQL, the project creates migration files and runs them.

`alembic.ini`

This is Alembic's main configuration file. It controls migration settings and points Alembic to the migration environment.

`alembic/env.py`

This file connects Alembic to the application's SQLAlchemy model metadata. That is what allows Alembic to compare models against the real database structure.

Migrations

Migration files live under `alembic/versions`. A migration records database structure changes such as creating a table, adding a column, or adding a foreign key.

Typical migration flow:

```text
change model -> create migration -> review migration -> run upgrade -> database structure changes
```

## 5. Phase 3 Explanation

Phase 3 added the core model foundation for users, companies, and company memberships.

`app/models/user.py`

The `User` model represents a person who can log in to the system. It stores account information such as email, hashed password, first name, last name, phone, timezone, and active status.

The `users` table is important for authentication and identity. It does not directly own company data. Instead, users connect to companies through memberships.

`app/models/company.py`

The `Company` model represents a dispatch company using the platform. Company-level operational data will belong to companies, not directly to users.

The `companies` table gives the backend a structure for multi-company dispatching. This matters because the same system may eventually support many dispatch companies.

`app/models/company_membership.py`

The `CompanyMembership` model connects users to companies. It stores the user's role and status inside a company.

This table makes the relationship flexible:

```text
one user -> many memberships -> many companies
one company -> many memberships -> many users
```

The `company_memberships` table currently includes fields such as `user_id`, `company_id`, `role`, and `status`.

Relationships

Relationships allow SQLAlchemy to move between related objects in Python.

Examples:

```text
user.memberships
company.memberships
membership.user
membership.company
```

This makes it easier to ask questions like:

- Which companies does this user belong to?
- Which users belong to this company?
- What role does this user have in this company?

`app/models/__init__.py`

This file imports models so SQLAlchemy and Alembic can discover them. If a model is not imported into the metadata path, Alembic may not detect it during migration generation.

Migration creation and upgrade

After the models were added, a migration was created to describe the new database tables. Running the migration upgrade applies those table changes to PostgreSQL.

Important distinction:

```text
models describe desired table structure
migrations apply table structure to PostgreSQL
```

## 6. Phase 4 Explanation

Phase 4 added authentication: registration, login, JWT creation, JWT decoding, and protected routes.

`app/core/security.py`

This file contains security utilities:

- Hash a plain password before saving it.
- Verify a login password against a stored hash.
- Create JWT access tokens.
- Decode and validate JWT access tokens.

Password hashing

Passwords are never stored as plain text. During registration, the backend hashes the password first, then stores only the hashed version.

Password verification

During login, the backend compares the entered password with the stored hash. If they match, the user is authenticated.

JWT creation

After successful registration or login, the backend creates a JWT access token. The token contains a subject value, currently the user id, and an expiration time.

JWT decoding

Protected routes decode the token to identify the current user. If the token is missing, expired, invalid, or points to a missing user, the request is rejected.

`app/schemas/user.py`

This file defines user-related API schemas. `UserCreate` validates registration input. `UserResponse` controls what user data is returned to the client and excludes sensitive fields like `hashed_password`.

`app/schemas/auth.py`

This file defines authentication request and response shapes. `LoginRequest` represents login credentials, and `AuthResponse` returns a token plus user information.

`app/services/auth_service.py`

This file contains authentication business logic. It handles:

- Looking up a user by email.
- Registering a new user.
- Rejecting duplicate emails.
- Hashing passwords.
- Authenticating login credentials.
- Rejecting inactive users.
- Creating a user access token.

`app/api/deps.py`

This file contains authentication dependencies, especially `get_current_user()`.

`get_current_user()` protects routes by:

```text
read Bearer token -> decode JWT -> get user id -> load user -> return current user
```

If anything fails, FastAPI returns an authentication or authorization error.

`app/api/v1/auth.py`

This file exposes the authentication endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Register flow

```text
client sends registration data
-> UserCreate validates input
-> register_user checks duplicate email
-> password is hashed
-> User row is saved
-> JWT token is created
-> token and user response are returned
```

Login flow

```text
client sends email and password
-> login endpoint receives form data
-> LoginRequest represents the credentials
-> authenticate_user finds user by email
-> password is verified
-> active status is checked
-> JWT token is created
-> token and user response are returned
```

Protected route flow

```text
client sends Authorization: Bearer <token>
-> OAuth2 dependency extracts token
-> token is decoded
-> user id is read from token subject
-> user is loaded from database
-> endpoint receives current_user
```

Swagger auth issue and OAuth2PasswordRequestForm fix

Swagger's built-in Authorize button follows OAuth2 password flow behavior. It sends credentials as form data with fields named `username` and `password`, not as a JSON body with `email` and `password`.

Using `OAuth2PasswordRequestForm` in the login endpoint fixed this mismatch. The backend treats `form_data.username` as the user's email and `form_data.password` as the password.

That makes Swagger authorization work correctly:

```text
Swagger Authorize -> form username/password -> backend maps username to email -> token returned
```

## 7. Request Lifecycle Examples

### POST /auth/register

Request comes in

The client sends registration data such as email, password, first name, last name, optional phone, and optional timezone.

Schema validates

`UserCreate` validates the request body. It confirms required fields are present and that the email has a valid email format.

Service handles logic

The route calls `register_user()` in `auth_service.py`. The service checks whether the email already exists. If it does, the request is rejected.

Model/database interaction

If the email is available, the service hashes the password, creates a `User` model object, adds it to the database session, commits the transaction, and refreshes the user object.

Response returned

The backend creates a JWT access token and returns an `AuthResponse` containing the token and safe user data.

### POST /auth/login

Request comes in

The client sends login credentials. For Swagger authorization, these credentials come in as form data using `username` and `password`.

Schema validates

The endpoint maps `form_data.username` to email and creates a `LoginRequest` object.

Service handles logic

The route calls `authenticate_user()`. The service finds the user by email, verifies the password, and checks that the account is active.

Model/database interaction

The database is queried for a matching user record. The stored password hash is used for verification, but it is never returned to the client.

Response returned

If login succeeds, the backend creates a JWT access token and returns an `AuthResponse`.

### GET /auth/me

Request comes in

The client sends a request with an authorization header:

```text
Authorization: Bearer <access_token>
```

Schema validates

There is no request body to validate. The response is shaped by `UserResponse`.

Service handles logic

The protected route depends on `get_current_user()`. This dependency handles the authentication logic before the endpoint runs.

Model/database interaction

`get_current_user()` decodes the JWT, extracts the user id, queries the `users` table, and confirms the user exists and is active.

Response returned

The endpoint returns the current authenticated user using `UserResponse`, without exposing the hashed password.

## 8. Important Concepts Learned

Models are table blueprints

SQLAlchemy models describe database tables. They define columns, types, foreign keys, and relationships.

Schemas are API validation

Pydantic schemas validate incoming API data and control outgoing API responses. They help keep API input and output predictable.

Services are business logic

Services contain the rules of the application. Routes should mostly receive requests, call services, and return responses.

Alembic changes database structure

Alembic migrations create or modify tables, columns, indexes, and foreign keys. Alembic is for database structure.

Normal app code changes database data

Application code inserts, updates, reads, and deletes rows inside existing tables. For example, registering a user creates data in the `users` table.

JWT proves identity

A JWT access token proves that a user successfully authenticated. The backend signs the token so it can later verify that the token is valid.

`get_current_user` protects routes

Protected routes use `get_current_user()` to require authentication. If the token is valid, the route receives the current user. If not, the request is rejected.

