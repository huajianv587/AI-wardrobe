from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.assistant import AssistantTask
from app.models.user import User

ACTIVE_TASK_STATUSES = {"queued", "running"}


def create_or_reuse_task(
    db: Session,
    user: User,
    task_type: str,
    input_payload: dict[str, Any],
    *,
    dedupe_fields: dict[str, Any] | None = None,
    replace_existing: bool = False,
) -> tuple[AssistantTask, bool]:
    if not replace_existing:
        existing = find_active_task(
            db,
            user_id=user.id,
            task_type=task_type,
            match_fields=dedupe_fields,
        )
        if existing is not None:
            return existing, False

    task = AssistantTask(
        user_id=user.id,
        task_type=task_type,
        status="queued",
        input_payload=input_payload,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task, True


def find_active_task(
    db: Session,
    *,
    user_id: int,
    task_type: str,
    match_fields: dict[str, Any] | None = None,
) -> AssistantTask | None:
    tasks = list(
        db.scalars(
            select(AssistantTask)
            .where(
                AssistantTask.user_id == user_id,
                AssistantTask.task_type == task_type,
                AssistantTask.status.in_(ACTIVE_TASK_STATUSES),
            )
            .order_by(desc(AssistantTask.id))
        ).all()
    )
    if not match_fields:
        return tasks[0] if tasks else None

    for task in tasks:
        payload = task.input_payload or {}
        if all(payload.get(key) == value for key, value in match_fields.items()):
            return task
    return None


def mark_task_running(db: Session, task_id: int) -> AssistantTask:
    task = _require_task(db, task_id)
    task.status = "running"
    task.error_message = None
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, task_id: int, result_payload: dict[str, Any]) -> AssistantTask:
    task = _require_task(db, task_id)
    task.status = "completed"
    task.result_payload = result_payload
    task.error_message = None
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def fail_task(db: Session, task_id: int, error_message: str) -> AssistantTask:
    task = _require_task(db, task_id)
    task.status = "failed"
    task.error_message = error_message
    task.updated_at = datetime.utcnow()
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, task_id: int, user: User) -> AssistantTask:
    task = _require_task(db, task_id)
    if task.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    return task


def _require_task(db: Session, task_id: int) -> AssistantTask:
    task = db.get(AssistantTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    return task
