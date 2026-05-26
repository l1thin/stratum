def run_pipeline(job_id: str) -> None:
    """Orchestrate the full pipeline for a given job_id.

    Stages (in order):
    1) Preprocessor: validate and normalize the image
    2) Segmentor: perform background segmentation
    3) Object detector: detect foreground objects
    4) OCR service: detect text and perform OCR
    5) Manifest builder: assemble layer manifest
    6) PSD generator: produce the final PSD file

    TODO: implement orchestration and job status updates.
    """
    # TODO: implement orchestration
    return None
