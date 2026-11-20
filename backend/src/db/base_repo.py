from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from .models import Base


class BaseRepository[T: Base]:
    def __init__(self, session: AsyncSession, model: type[T]):
        self._session = session
        self._model = model

    async def add(self, entity: T):
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def filter_by(self, **criteria: Any):
        pass

    async def update(self, entity: T, **data: Any):
        for key, value in data.items():
            setattr(entity, key, value)
        await self._session.flush()
        return entity

    async def delete(self, entity: T):
        await self._session.delete(entity)
        await self._session.flush()
