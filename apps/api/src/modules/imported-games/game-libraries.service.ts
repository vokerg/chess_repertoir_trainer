import type { GameLibrariesResponse, GameLibrary } from '@chess-trainer/contracts/imported-games';
import { GameLibrariesRepository as repository } from './game-libraries.repository.prisma';

export const GameLibrariesService = {
  async list(userId: number): Promise<GameLibrariesResponse> {
    const rows = await repository.list(userId);
    return { items: rows.map(({ id, name, _count }) => ({ id, name, gameCount: _count.games })) };
  },
  async create(userId: number, name: string): Promise<GameLibrary> {
    return { ...await repository.create(userId, name), gameCount: 0 };
  },
  async rename(userId: number, id: number, name: string) {
    return (await repository.rename(userId, id, name)).count > 0;
  },
  async remove(userId: number, id: number) {
    return (await repository.remove(userId, id)).count > 0;
  },
  async like(userId: number, id: number, liked: boolean) {
    return (await repository.like(userId, id, liked)).count > 0;
  },
  setMembership: repository.setMembership,
};
