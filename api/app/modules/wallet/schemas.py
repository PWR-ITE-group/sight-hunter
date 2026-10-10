from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int | None
    nickname: str
    xp: int


class LeaderboardOut(BaseModel):
    items: list[LeaderboardEntry]
    me: LeaderboardEntry
