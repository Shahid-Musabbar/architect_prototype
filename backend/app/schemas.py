from pydantic import BaseModel


class Profile(BaseModel):
    id: str
    email: str
    name: str | None = None
    workspace: str | None = None
    region: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    workspace: str | None = None
    region: str | None = None
