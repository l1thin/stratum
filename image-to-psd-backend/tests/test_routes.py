from fastapi.testclient import TestClient
import pytest
from main import app
from models.job import update_job, job_store

client = TestClient(app)

def test_get_job_status_not_found():
    # Calling get_job_status on a non-existent job ID should return 404
    response = client.get("/api/status/non-existent-job-id")
    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found"}

def test_get_job_status_success():
    # Update a job in the store first
    job_id = "test-job-123"
    update_job(job_id, status="queued", progress=10)
    
    response = client.get(f"/api/status/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == job_id
    assert data["status"] == "queued"
    assert data["progress"] == 10
