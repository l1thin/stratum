"""Job state model and file-backed job tracker."""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

job_store_mem = {}


class FileBackedJobStore:
    def get(self, job_id: str):
        # 1. Check in-memory store first
        if job_id in job_store_mem:
            return job_store_mem[job_id]

        # 2. Check filesystem status.json
        try:
            project_root = Path(__file__).resolve().parents[1]
            outputs_dir = project_root / "outputs"
            job_dir = outputs_dir / str(job_id)
            status_file = job_dir / "status.json"
            if status_file.exists():
                with open(status_file, "r", encoding="utf-8") as f:
                    job_data = json.load(f)
                    # Cache in memory for quick retrieval
                    job_store_mem[job_id] = job_data
                    return job_data
        except Exception as e:
            logger.debug("Failed to read job status file: %s", e)
        return None


# Instantiate as the importable job_store
job_store = FileBackedJobStore()


def update_job(job_id: str, status: str, progress: int = 0, error: str = None):
    """Update job entry in both memory and file-backed store."""
    job_data = {"status": status, "progress": progress, "error": error}
    job_store_mem[job_id] = job_data

    # Save to disk under outputs/{job_id}/status.json
    try:
        project_root = Path(__file__).resolve().parents[1]
        outputs_dir = project_root / "outputs"
        job_dir = outputs_dir / str(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        status_file = job_dir / "status.json"
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(job_data, f, indent=2)
    except Exception as e:
        logger.error("Failed to write job status to disk: %s", e)

    return job_data

