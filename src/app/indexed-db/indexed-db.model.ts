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

type DbAction = 'insert' | 'update' | 'delete' | 'merge' | 'select'

interface DbBaseRequest {
  table: string;
  action: DbAction;
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

interface BaseFilter<T extends BaseTableType> {
  column: KeyOfObj<T>;
  operation: 'eq' | 'not_eq' | 'like' | 'gt' | 'ge' | 'ls' | 'le' | 'in' | 'not_in';
}

export interface ValueFilter<T extends BaseTableType> extends BaseFilter<T> {
  operation: 'eq' | 'not_eq' | 'gt' | 'ge' | 'ls' | 'le';
  value: ValueOf<T>;
}

export interface LikeInterface<T extends BaseTableType> extends BaseFilter<T> {
  operation: 'like';
  value: string;
}

export interface CollectionFilter<T extends BaseTableType> extends BaseFilter<T> {
  operation: 'in' | 'not_in';
  values: NonEmptyArray<ValueOf<T>>;
}

export type Filter<T extends BaseTableType> = ValueFilter<T> | LikeInterface<T> | CollectionFilter<T>;

export interface Paginator {
  page: number;
  pageSize: number;
}


// TODO: COUNT
export interface DbSelect<T extends BaseTableType> extends DbBaseRequest {
  action: 'select';
  order?: KeyOfObj<T>;
  filters?: NonEmptyArray<Filter<T>>;
  paginator?: Paginator;
}

export type DbRequest<T extends BaseTableType> = DbInsert<T> | DbUpdate<T> | DbDelete<T> | DbSelect<T>;


interface DbBaseResponse {
  table: string;
  action: DbAction | 'error';
}

export interface DbUpdateResponse extends DbBaseResponse {
  action: 'insert' | 'update' | 'merge';
  elementChanged: number;
}

export interface DbDeleteResponse extends DbBaseResponse {
  action: 'delete';
}

export interface DbSelectResponse<T extends BaseTableType> extends DbBaseResponse {
  action: 'select';
  result: Array<T>;
}

export interface DbErrorResponse extends DbBaseResponse {
  action: 'error';
  message: string;
}

export type DbResponse<T extends BaseTableType> =
  DbUpdateResponse
  | DbDeleteResponse
  | DbSelectResponse<T>
  | DbErrorResponse;


