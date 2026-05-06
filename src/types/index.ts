export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database.types';

export { Constants } from './database.types';

import type { Enums } from './database.types';

export type Role = Enums<'user_role'>;
