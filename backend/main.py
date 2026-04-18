from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import router

app = FastAPI(title="ATM Fraud Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router)

# 🔥 FRONTEND SERVE (ADD THIS)
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")