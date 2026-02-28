import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.issue import Issue, IssueStatus
from app.schemas.issue import IssueCreate, IssueResponse, IssueStatusUpdate
from app.services.image_classification import classify_issue_image

router = APIRouter(prefix="/issues", tags=["Issue Reporting"])

UPLOAD_DIR = Path("uploads/issues")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/report", response_model=IssueResponse, status_code=201)
async def report_issue(
    reporter_id: str = Form(None),
    description: str = Form(None),
    address: str = Form(None),
    latitude: float = Form(None),
    longitude: float = Form(None),
    image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a citizen infrastructure issue report.
    AI triage automatically classifies the image, estimates severity,
    routes to the correct department, and provides a resolution timeline.
    """
    image_url = None
    ai_result = None

    if image:
        ext = Path(image.filename).suffix
        filename = f"{uuid.uuid4()}{ext}"
        dest = UPLOAD_DIR / filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_url = f"/static/issues/{filename}"

        # AI triage
        ai_result = await classify_issue_image(str(dest))

    issue = Issue(
        reporter_id=reporter_id,
        description=description,
        address=address,
        image_url=image_url,
        category=ai_result.category if ai_result else "other",
        severity=ai_result.severity if ai_result else "medium",
        department=ai_result.department if ai_result else "general_dept",
        estimated_resolution_days=ai_result.estimated_resolution_days if ai_result else 7,
        ai_confidence=ai_result.confidence if ai_result else None,
        status=IssueStatus.triaged if ai_result else IssueStatus.pending,
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return issue


@router.get("/", response_model=List[IssueResponse])
async def list_issues(
    status: str = None,
    category: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List submitted issues, optionally filtered by status or category."""
    q = select(Issue).order_by(Issue.created_at.desc()).limit(limit)
    if status:
        q = q.where(Issue.status == status)
    if category:
        q = q.where(Issue.category == category)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.patch("/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    issue_id: str,
    payload: IssueStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update issue resolution status (used by city staff)."""
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.status = payload.status
    await db.commit()
    await db.refresh(issue)
    return issue
