"""Job state model and in-memory job tracker."""

job_store = {}


def update_job(job_id: str, status: str, progress: int = 0, error: str = None):
    """Update or create a job entry in the in-memory store.

    job_store maps job_id -> {"status": str, "progress": int, "error": str}
    """
    job_store[job_id] = {"status": status, "progress": progress, "error": error}
    return job_store[job_id]
