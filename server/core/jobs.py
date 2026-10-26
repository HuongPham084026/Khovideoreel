"""Chạy tác vụ nền (dựng video, phiên âm...) có log, tiến độ và nút hủy."""
import threading
import time
import traceback
import uuid


class Cancelled(Exception):
    pass


class Job:
    def __init__(self, kind: str):
        self.id = uuid.uuid4().hex[:10]
        self.kind = kind
        self.status = "running"  # running | done | error | cancelled
        self.progress = 0.0
        self.stage = ""
        self.logs: list[str] = []
        self.result = None
        self.error = None
        self.started = time.time()
        self._procs = []
        self._cancel = False

    # --- API cho tác vụ ---
    def log(self, msg: str):
        self.logs.append(str(msg))

    def set(self, progress: float | None = None, stage: str | None = None):
        if progress is not None:
            self.progress = max(0.0, min(100.0, progress))
        if stage is not None:
            self.stage = stage
            self.log(f"▶ {stage}")

    def check(self):
        if self._cancel:
            raise Cancelled()

    def track(self, proc):
        self._procs.append(proc)

    def cancel(self):
        self._cancel = True
        for p in self._procs:
            try:
                p.terminate()
            except Exception:  # noqa: BLE001
                pass

    def to_dict(self, since: int = 0):
        return {
            "id": self.id, "kind": self.kind, "status": self.status,
            "progress": round(self.progress, 1), "stage": self.stage,
            "logs": self.logs[since:], "log_total": len(self.logs),
            "result": self.result, "error": self.error,
            "elapsed": round(time.time() - self.started, 1),
        }


JOBS: dict[str, Job] = {}


def start(kind: str, fn, *args, **kwargs) -> Job:
    job = Job(kind)
    JOBS[job.id] = job

    def run():
        try:
            job.result = fn(job, *args, **kwargs)
            job.progress = 100.0
            job.status = "done"
        except Cancelled:
            job.status = "cancelled"
            job.log("⏹ Đã hủy")
        except Exception as e:  # noqa: BLE001
            job.status = "error"
            job.error = str(e)
            job.log(traceback.format_exc())

    threading.Thread(target=run, daemon=True).start()
    return job
