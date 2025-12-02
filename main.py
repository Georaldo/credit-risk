from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.model_api import router as model_router
from api.oracle_api import router as oracle_router
from api.auth_api import router as auth_router
from api.manager_api import router as manager_router
from api.loan_officer_api import router as officer_router
from api.customer_api import router as customer_router


app = FastAPI(title="Smart Credit APIs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(model_router, prefix="/model")
app.include_router(oracle_router, prefix="/oracle")  
app.include_router(auth_router, prefix="/auth")
app.include_router(manager_router, prefix="/manager")
app.include_router(manager_router, prefix="/manager")
app.include_router(officer_router, prefix="/officer")
app.include_router(customer_router, prefix="/customer")
