from pathlib import Path


def get_job_dir(job_id: str) -> str:
    """Return the job output directory path under ./outputs/{job_id}/.

    Ensures the directory exists and returns the path string ending with '/'.
    """
    # locate the project root (parent of utils)
    project_root = Path(__file__).resolve().parents[1]
    outputs_dir = project_root / "outputs"
    job_dir = outputs_dir / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    # normalize to string path with trailing slash
    return str(job_dir.as_posix()) + "/"
