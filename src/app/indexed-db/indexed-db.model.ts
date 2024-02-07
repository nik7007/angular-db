import type {IndexableType, Transaction} from "dexie";

export type NonEmptyArray<T> = [T, ...T[]];
export type OneOrMulti<T> = NonEmptyArray<T> | T;

export type KeyOfObj<T> = keyof T;
export type ValueOf<T> = T[KeyOfObj<T>];
export type BaseTableType = Record<string, IndexableType>;

export interface SchemaVersion {
  version: number;
  schema: Record<string, string>;
  upgrade?: (trans: Transaction) => PromiseLike<any> | void
}

interface DbBaseRequest {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'select' | 'merge';
}


export interface DbInsert<T extends BaseTableType> extends DbBaseRequest {
  action: 'insert';
  elements: OneOrMulti<T>;
}

export interface DbUpdate<T extends BaseTableType> extends DbBaseRequest {
  action: 'update' | 'merge';
  keyName: KeyOfObj<T>;
  elements: OneOrMulti<T>;
}

export interface DbDelete<T extends BaseTableType> extends DbBaseRequest {
  action: 'delete';
  key: OneOrMulti<ValueOf<T>>;
}

export type DbRequest<T extends BaseTableType> = DbInsert<T> | DbUpdate<T> | DbDelete<T>;
