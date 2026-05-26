# Phase 5-6 Explanation

This document explains Phase 5 and Phase 6 of the AI-Assisted Dispatching MVP backend.

The backend uses:

- FastAPI for HTTP APIs
- PostgreSQL for persistent data storage
- SQLAlchemy for database models and queries
- Alembic for database migrations
- JWT authentication for identifying logged-in users
- A modular folder structure that separates routes, schemas, services, models, and core utilities

The goal of these phases is to move from simple authentication into real company operations: company membership, trucks, and drivers.

## Phase 5 - Companies & Memberships

### Goal

Phase 5 allows authenticated users to create companies and manage who belongs to those companies.

In this backend, a `Company` belongs to the system. A `User` does not directly own company data. Instead, users access company data through `CompanyMembership`.

The relationship is:

```text
User -> CompanyMembership -> Company
```

This design supports one user belonging to multiple companies, and one company having many users.

### Main Concepts

Authentication answers:

```text
Who are you?
```

In this project, authentication is handled by JWT and `get_current_user()`.

Authorization answers:

```text
What are you allowed to do?
```

In Phase 5, authorization depends on company membership and role. For example:

- Any active member can list company members.
- Only an active admin can invite, update, or remove members.
- Only an active admin can update company details.

When a user creates a company, the creator automatically becomes an admin through a `CompanyMembership` row.

Removed members are not deleted from the database. Their membership `status` becomes `"removed"`. This keeps history available and avoids losing audit context.

Permission logic should eventually be centralized in `app/core/permissions.py`. Right now, `membership_service.py` and `company_service.py` include some duplicated/manual permission checks. TODO: refactor those services later to fully use `permissions.py`.

### app/schemas/company.py

This file defines API validation and response shapes for companies.

Important schemas:

- `CompanyCreate`
- `CompanyUpdate`
- `CompanyResponse`

`CompanyCreate` is used by `POST /companies`. It currently accepts a company `name`.

`CompanyUpdate` is used by `PATCH /companies/{company_id}`. Its fields are optional so an endpoint can update only the fields provided by the client.

`CompanyResponse` controls what company data is returned to the frontend. It includes:

- `id`
- `name`

The `from_attributes = True` configuration lets Pydantic convert a SQLAlchemy `Company` model object into a response schema.

### app/schemas/membership.py

This file defines request and response schemas for company membership actions.

Important schemas:

- `MemberInviteRequest`
- `MembershipUpdate`
- `MembershipResponse`

`MemberInviteRequest` is used when an admin invites or adds a user to a company. In the MVP, the invited user must already exist in the system. The request uses the user's email and can include a role.

`MembershipUpdate` is used to change a member's `role` or `status`.

`MembershipResponse` returns membership information:

- `id`
- `user_id`
- `company_id`
- `role`
- `status`

### app/services/company_service.py

This service contains company business logic. API routes call this file instead of placing all logic directly in route functions.

#### create_company()

Creates a new company and automatically makes the current user an admin.

Flow:

```text
create Company row
-> commit and refresh company
-> create CompanyMembership row
-> role = admin
-> status = active
-> commit membership
-> return company
```

This is important because the company creator needs immediate admin access.

#### list_my_companies()

Returns companies where the current user has an active membership.

It joins `Company` with `CompanyMembership` and filters by:

- current user's id
- membership status `"active"`

This prevents users from seeing companies they do not belong to.

#### get_company_by_id()

Looks up a company by database id.

Important: this helper does not check permissions by itself. It only finds the company. Permission checks must happen before or around it.

#### get_my_company()

Returns one company only if the current user is an active member of that company.

If the company does not exist or the user does not have access, it raises a `404 Not Found` with an access-denied style message.

#### update_company()

Updates company information.

Current behavior:

- Checks whether the current user is an active admin.
- Loads the company.
- Updates provided fields.
- Saves and returns the updated company.

TODO: this currently performs a manual admin membership query. Later, this should use `app/core/permissions.py` fully.

### app/services/membership_service.py

This service manages users inside companies.

#### get_membership()

Finds a membership by `user_id` and `company_id`.

It is useful for checking whether a user already belongs to a company.

#### require_company_admin()

Requires the current user to be an active admin of the company.

If the user is not an active admin, it raises `403 Forbidden`.

TODO: this duplicates logic that also exists in `app/core/permissions.py`.

#### require_company_member()

Requires the current user to be an active company member.

If the user is not an active member, it raises `403 Forbidden`.

TODO: this also overlaps with `app/core/permissions.py`.

#### invite_member()

Adds an existing user to a company.

Flow:

```text
require current user to be admin
-> find invited user by email
-> check existing membership
-> reactivate/update existing membership if present
-> otherwise create new CompanyMembership
-> return membership
```

In the MVP, this is not a full email invitation system. It immediately adds an existing user as an active member.

#### list_company_members()

Lists all memberships for a company.

Any active company member can call this function. It first checks membership access, then queries `CompanyMembership` rows for the company.

#### update_membership()

Allows an admin to update a member's role or status.

It:

- Requires admin access.
- Finds the membership by `membership_id` and `company_id`.
- Updates only provided fields.
- Commits and returns the membership.

#### remove_membership()

Removes a member from a company without deleting the database row.

It:

- Requires admin access.
- Finds the membership.
- Sets `status = "removed"`.
- Commits and returns the membership.

This preserves membership history.

### app/core/permissions.py

This file is meant to centralize authorization logic.

Authentication happens elsewhere. This file is about permissions: whether the authenticated user is allowed to access or modify a company resource.

#### get_active_membership()

Returns the active membership for the current user and company, or `None` if the user is not an active member.

#### require_company_member()

Requires an active company membership.

Use this when any active member is allowed to perform the action, such as listing company drivers or trucks.

#### require_company_admin()

Requires active admin membership.

Use this when only admins are allowed to perform the action, such as removing members or deactivating resources.

#### user_is_company_member()

Returns a boolean instead of raising an exception.

This is useful when code needs conditional logic.

#### user_is_company_admin()

Returns `True` if the current user is an active admin of the company.

This is also useful for conditional logic where an exception is not desired.

### app/api/v1/companies.py

This file defines company API endpoints. All endpoints require authentication through `get_current_user()`.

#### POST /companies

Creates a company.

Uses:

- `CompanyCreate` request schema
- `create_company()` service
- `CompanyResponse` response schema

#### GET /companies

Lists companies the current user belongs to.

Uses:

- `list_my_companies()` service
- `list[CompanyResponse]` response schema

#### GET /companies/{company_id}

Gets one company by id.

The user must be an active member of that company.

Uses:

- `get_my_company()` service
- `CompanyResponse` response schema

#### PATCH /companies/{company_id}

Updates company information.

The user must be an active company admin.

Uses:

- `CompanyUpdate` request schema
- `update_company()` service
- `CompanyResponse` response schema

### app/api/v1/memberships.py

This file defines membership management endpoints.

The router prefix is:

```text
/companies/{company_id}/members
```

#### POST /companies/{company_id}/members/invite

Adds an existing user to the company.

The current user must be an admin.

Uses:

- `MemberInviteRequest`
- `invite_member()`
- `MembershipResponse`

#### GET /companies/{company_id}/members

Lists company members.

Any active company member can view the list.

Uses:

- `list_company_members()`
- `list[MembershipResponse]`

#### PATCH /companies/{company_id}/members/{membership_id}

Updates a member's role or status.

The current user must be an admin.

Uses:

- `MembershipUpdate`
- `update_membership()`
- `MembershipResponse`

#### DELETE /companies/{company_id}/members/{membership_id}

Marks a membership as removed.

The current user must be an admin.

Uses:

- `remove_membership()`
- `MembershipResponse`

### app/main.py router connections for Phase 5

`app/main.py` imports and registers the company and membership routers:

```text
companies_router -> app/api/v1/companies.py
memberships_router -> app/api/v1/memberships.py
```

Registering routers is what makes the endpoints available in the FastAPI application.

### Phase 5 Request Flow Examples

#### POST /companies

```text
API endpoint
-> CompanyCreate schema
-> create_company() service
-> Company and CompanyMembership models
-> DB session
-> PostgreSQL
-> CompanyResponse
```

Detailed flow:

1. The authenticated user sends a company name.
2. `get_current_user()` identifies the user from the JWT.
3. `CompanyCreate` validates the request body.
4. `create_company()` creates the company.
5. The service creates an admin membership for the creator.
6. SQLAlchemy commits both records.
7. FastAPI returns `CompanyResponse`.

#### POST /companies/{company_id}/members/invite

```text
API endpoint
-> MemberInviteRequest schema
-> invite_member() service
-> User and CompanyMembership models
-> DB session
-> PostgreSQL
-> MembershipResponse
```

Detailed flow:

1. The authenticated admin sends an email and optional role.
2. `MemberInviteRequest` validates the email and role.
3. `invite_member()` checks admin permission.
4. The service finds the invited user by email.
5. The service creates or reactivates a membership.
6. SQLAlchemy commits the membership.
7. FastAPI returns `MembershipResponse`.

#### GET /companies/{company_id}/members

```text
API endpoint
-> no request body schema
-> list_company_members() service
-> CompanyMembership model
-> DB session
-> PostgreSQL
-> list[MembershipResponse]
```

Detailed flow:

1. The authenticated user requests the member list.
2. `get_current_user()` identifies the user.
3. `list_company_members()` checks that the user is an active company member.
4. The service queries company memberships.
5. FastAPI returns a list of membership responses.

## Phase 6 - Trucks & Drivers

### Goal

Phase 6 allows company users to manage trucks and drivers.

Companies own trucks and drivers. A user must have company access before they can view or change company trucks and drivers.

### Main Concepts

The `Driver` table stores the full driver profile.

The `Truck` table stores operational truck information.

In the truck model:

```text
id = database primary key
truck_id = internal company truck number
```

So `truck_id` is the dispatcher-facing truck number, not the database id.

Drivers can change trucks. A truck stores:

- `current_driver_id`
- `current_driver_name`
- `current_driver_surname`

The name and surname fields are duplicated on the truck for fast UI display. This lets the frontend show current driver information quickly without always joining against the driver table.

Phase 6 uses deactivation instead of hard deletion. Drivers and trucks are marked inactive rather than removed from the database. This protects future history for searches, bookings, and dispatching records.

Company membership checks are required before accessing trucks or drivers.

Admin-only deactivation is implemented for:

- `deactivate_driver()`
- `deactivate_truck()`

Driver assignment updates truck display fields so the truck always shows the currently assigned driver's name.

### app/models/driver.py

The `Driver` model represents a driver inside one company.

Important fields:

- `id`: database primary key
- `company_id`: company that owns the driver
- `first_name`
- `last_name`
- `phone`
- `email`
- `home_location`
- `preferences`
- `notes`
- `status`

The `company_id` foreign key connects drivers to companies.

The `status` field supports deactivation. A driver can become `"inactive"` instead of being deleted.

The model also defines a relationship to trucks:

```text
Driver.trucks -> trucks where this driver is the current driver
```

### app/models/truck.py

The `Truck` model represents a truck inside one company.

Important fields:

- `id`: database primary key
- `company_id`: company that owns the truck
- `truck_id`: internal company truck number
- `current_driver_id`: optional driver currently assigned
- `current_driver_name`
- `current_driver_surname`
- `equipment_type`
- `status`
- `notes`

The `current_driver_id` foreign key connects the truck to the `drivers` table.

The current driver name fields are stored directly on the truck for faster UI display.

### app/models/__init__.py

This file imports SQLAlchemy models so Alembic and SQLAlchemy metadata can discover them.

For Phase 6, it imports:

- `Driver`
- `Truck`

If models are not imported into the metadata path, Alembic may not detect them during migration generation.

### Alembic migration for trucks/drivers

Alembic migrations are responsible for applying model structure to PostgreSQL.

For trucks and drivers, the migration should create database structure for:

- `drivers` table
- `trucks` table
- indexes
- foreign keys to `companies`
- foreign key from `trucks.current_driver_id` to `drivers.id`

The general flow is:

```text
Driver and Truck models added
-> Alembic migration generated
-> migration reviewed
-> migration upgraded
-> PostgreSQL has drivers and trucks tables
```

### app/schemas/driver.py

This file defines driver API input and output schemas.

Important schemas:

- `DriverCreate`
- `DriverUpdate`
- `DriverResponse`

`DriverCreate` validates new driver data.

`DriverUpdate` supports partial updates. All fields are optional so a request can update one field without sending the full driver object.

`DriverResponse` controls what driver data is returned to the frontend.

### app/schemas/truck.py

This file defines truck API schemas.

Important schemas:

- `TruckCreate`
- `TruckUpdate`
- `AssignDriverRequest`
- `TruckResponse`

`TruckCreate` validates new truck data. It can optionally include `current_driver_id` to assign a driver during truck creation.

`TruckUpdate` supports partial truck updates.

`AssignDriverRequest` is used by the assign-driver endpoint. If `driver_id` is an integer, the driver is assigned. If `driver_id` is `null`, the current driver is unassigned.

`TruckResponse` includes current driver display fields for the UI.

### app/services/driver_service.py

This service contains driver business logic.

#### create_driver()

Creates a new driver inside a company.

It first requires company membership using `require_company_member()`. Then it creates a `Driver` model and commits it.

#### list_company_drivers()

Lists all drivers for a company.

It requires the current user to be an active company member.

#### get_driver_by_id()

Gets one driver by database id.

It checks:

- the user belongs to the company
- the driver belongs to the same company

This prevents a user from accessing a driver from another company.

#### update_driver()

Updates driver information.

It uses the update schema's provided fields only, then commits and refreshes the driver.

#### deactivate_driver()

Marks a driver as inactive instead of deleting the row.

This requires company admin access.

#### assign_driver_to_truck()

Assigns or reassigns a driver to a truck.

It:

- Requires company membership.
- Loads the driver inside the company.
- Loads the truck inside the company.
- Updates the truck's current driver fields.
- Commits and returns the truck.

Note: the truck API currently uses the assignment function in `truck_service.py`. This driver service function exists as related service logic.

### app/services/truck_service.py

This service contains truck business logic.

#### create_truck()

Creates a new truck inside a company.

It:

- Requires company membership.
- Checks that the internal `truck_id` is unique inside the company.
- Optionally assigns a current driver if `current_driver_id` is provided.
- Creates and commits the truck.

#### list_company_trucks()

Lists trucks for a company.

It requires active company membership.

#### get_truck_by_id()

Gets one truck by database id.

It checks:

- the user belongs to the company
- the truck belongs to the same company

#### update_truck()

Updates truck information.

If the internal `truck_id` is changed, the service checks that the new value is not already used by another truck in the same company.

#### deactivate_truck()

Marks a truck as inactive instead of deleting it.

This requires company admin access.

#### assign_driver_to_truck()

Assigns or unassigns a driver from a truck.

If `driver_id` is `None`, the service clears:

- `current_driver_id`
- `current_driver_name`
- `current_driver_surname`

If `driver_id` is provided, the service confirms the driver belongs to the same company, then updates the truck display fields.

### app/api/v1/drivers.py

This file defines driver endpoints. All endpoints require authentication. Company membership checks happen inside the service layer.

#### POST /companies/{company_id}/drivers

Creates a driver for a company.

Uses:

- `DriverCreate`
- `create_driver()`
- `DriverResponse`

#### GET /companies/{company_id}/drivers

Lists company drivers.

Uses:

- `list_company_drivers()`
- `list[DriverResponse]`

#### GET /companies/{company_id}/drivers/{driver_id}

Gets one driver.

Uses:

- `get_driver_by_id()`
- `DriverResponse`

#### PATCH /companies/{company_id}/drivers/{driver_id}

Updates driver information.

Uses:

- `DriverUpdate`
- `update_driver()`
- `DriverResponse`

#### DELETE /companies/{company_id}/drivers/{driver_id}

Deactivates a driver instead of deleting the row.

Uses:

- `deactivate_driver()`
- `DriverResponse`

### app/api/v1/trucks.py

This file defines truck endpoints. All endpoints require authentication. Company membership checks happen inside the service layer.

#### POST /companies/{company_id}/trucks

Creates a truck for a company.

Uses:

- `TruckCreate`
- `create_truck()`
- `TruckResponse`

#### GET /companies/{company_id}/trucks

Lists company trucks.

Uses:

- `list_company_trucks()`
- `list[TruckResponse]`

#### GET /companies/{company_id}/trucks/{truck_id}

Gets one truck by database id.

Important: in this path, `{truck_id}` is used as the database id parameter in the service, even though the model also has an internal `truck_id` field.

Uses:

- `get_truck_by_id()`
- `TruckResponse`

#### PATCH /companies/{company_id}/trucks/{truck_id}

Updates truck information.

Uses:

- `TruckUpdate`
- `update_truck()`
- `TruckResponse`

#### DELETE /companies/{company_id}/trucks/{truck_id}

Deactivates a truck instead of deleting the row.

Uses:

- `deactivate_truck()`
- `TruckResponse`

#### POST /companies/{company_id}/trucks/{truck_id}/assign-driver

Assigns or unassigns a driver.

Uses:

- `AssignDriverRequest`
- `assign_driver_to_truck()`
- `TruckResponse`

### app/main.py router connections for Phase 6

`app/main.py` imports and registers:

```text
drivers_router -> app/api/v1/drivers.py
trucks_router -> app/api/v1/trucks.py
```

Without `app.include_router(...)`, the route files would exist but their endpoints would not be available through FastAPI.

### Phase 6 Request Flow Examples

#### POST /companies/{company_id}/drivers

```text
API endpoint
-> DriverCreate schema
-> create_driver() service
-> permission check
-> Driver model
-> DB session
-> PostgreSQL
-> DriverResponse
```

Detailed flow:

1. The authenticated user sends driver profile data.
2. `get_current_user()` identifies the user.
3. `DriverCreate` validates the request body.
4. `create_driver()` checks active company membership.
5. The service creates a `Driver` model.
6. SQLAlchemy commits the new driver.
7. FastAPI returns `DriverResponse`.

#### POST /companies/{company_id}/trucks

```text
API endpoint
-> TruckCreate schema
-> create_truck() service
-> permission check
-> Truck model
-> DB session
-> PostgreSQL
-> TruckResponse
```

Detailed flow:

1. The authenticated user sends truck data.
2. `TruckCreate` validates the request body.
3. `create_truck()` checks active company membership.
4. The service checks that the internal truck number is unique inside the company.
5. If a current driver is provided, the service confirms that driver belongs to the company.
6. The service creates a `Truck` model.
7. SQLAlchemy commits the truck.
8. FastAPI returns `TruckResponse`.

#### POST /companies/{company_id}/trucks/{truck_id}/assign-driver

```text
API endpoint
-> AssignDriverRequest schema
-> assign_driver_to_truck() service
-> permission check
-> Truck and Driver models
-> DB session
-> PostgreSQL
-> TruckResponse
```

Detailed flow:

1. The authenticated user sends `driver_id` or `null`.
2. `AssignDriverRequest` validates the body.
3. `assign_driver_to_truck()` checks active company membership.
4. The service loads the truck for that company.
5. If assigning, the service loads the driver for that company.
6. The service updates the truck's current driver fields.
7. SQLAlchemy commits the change.
8. FastAPI returns `TruckResponse`.

## How Phase 5 and Phase 6 connect

Auth gives the backend `current_user`.

`CompanyMembership` decides whether that user can access a company's data.

Companies own trucks and drivers:

```text
Company
-> Drivers
-> Trucks
```

Trucks and drivers depend on company access checks. A user should not be able to view or change trucks and drivers unless they are an active member of the company.

Admin-only actions build on the same membership idea, but also require the membership role to be `"admin"`.

Later searches will depend on trucks and drivers because dispatch searches need operational company data, especially available trucks, assigned drivers, equipment, locations, and preferences.

## Important backend architecture recap

API routes receive HTTP requests.

Route files in `app/api/v1` define URLs, HTTP methods, dependencies, request schemas, and response schemas.

Schemas validate input and shape output.

Pydantic schemas in `app/schemas` make sure incoming data has the expected shape and outgoing responses do not expose unwanted fields.

Services contain business logic.

Service files in `app/services` decide what should happen: create a company, invite a member, create a truck, deactivate a driver, or assign a driver to a truck.

Models represent database tables.

SQLAlchemy models in `app/models` define tables, columns, foreign keys, and relationships.

SQLAlchemy sessions save and read data.

The DB session is passed into services. It performs queries, adds objects, commits changes, refreshes objects, and talks to PostgreSQL through the SQLAlchemy engine.

Alembic creates and updates table structure.

Alembic migrations change the database schema. They create tables, add columns, create indexes, and define foreign keys.

PostgreSQL stores real data.

PostgreSQL is the permanent source of truth for users, companies, memberships, trucks, drivers, and later dispatching/search data.

