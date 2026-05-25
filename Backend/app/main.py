"""
Main FastAPI application entry point.

Purpose:
- Create FastAPI app
- Register API routers
- Define global app configuration

This is the main backend starting point.
"""

from fastapi import FastAPI

# Import API routers
from app.api.v1.auth import router as auth_router
from app.api.v1.companies import router as companies_router
from app.api.v1.memberships import router as memberships_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.trucks import router as trucks_router
from app.api.v1.load_boards import router as load_boards
from app.api.v1.searches import router as searches_router
from app.api.v1.loads import router as loads_router
from app.api.v1.websockets import router as websockets_router
from app.api.v1.dispatcher_actions import router as dispatcher_actions_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.scoring import router as scoring_router


"""
Create FastAPI application instance.
"""

app = FastAPI(
    title="AI-Assisted Dispatching API",
    version="0.1.0",
    description="Backend API for AI-assisted dispatching MVP",
)


"""
Health check endpoint.

Purpose:
- Verify backend is running
- Verify deployment/server health
"""

@app.get("/health")
def health_check():

    return {
        "status": "ok",
        "message": "AI-Assisted Dispatching backend is running",
    }


"""
Register authentication routes.

This connects:
app/api/v1/auth.py

to FastAPI application.
"""

app.include_router(auth_router)

"""
Register company routes.
"""

app.include_router(companies_router)

"""
Register membership routes.
"""

app.include_router(memberships_router)


"""
Register driver routes.
"""

app.include_router(drivers_router)

"""
Register Truck routes.
"""
app.include_router(trucks_router)

"""
Register Laod Boards Router
"""

app.include_router(load_boards)

"""
Register Searches Router
"""

app.include_router(searches_router)

"""
Register Loads Router
"""

app.include_router(loads_router)

"""
Register WebSockets Router
"""

app.include_router(websockets_router)

"""
Register Dispatcher Actions Router
"""

app.include_router(dispatcher_actions_router)

"""
Register Bookings Router
"""

app.include_router(bookings_router)

"""
Register Scoring Router
"""

app.include_router(scoring_router)
