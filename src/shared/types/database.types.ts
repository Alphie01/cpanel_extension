/* Database API contracts (shared backend + frontend). */
export interface DatabaseDto {
  name: string;
  users: string[];
  sizeMb: number | null;
}

export interface DatabaseUserDto {
  user: string;
}

export interface DatabasesOverview {
  databases: DatabaseDto[];
  users: DatabaseUserDto[];
}
