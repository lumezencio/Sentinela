from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["saude"])


@router.get("/saude")
async def saude() -> dict[str, str]:
    return {"status": "ok"}
