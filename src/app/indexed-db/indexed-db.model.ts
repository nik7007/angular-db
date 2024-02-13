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

export type FiltersOperation = 'eq' | 'not_eq' | 'like' | 'gt' | 'ge' | 'ls' | 'le' | 'in' | 'not_in';

export interface BaseFilter<T extends BaseTableType> {
  column: KeyOfObj<T>;
  operation: FiltersOperation;
}

export interface ValueFilter<T extends BaseTableType> extends BaseFilter<T> {
  operation: 'eq' | 'not_eq' | 'gt' | 'ge' | 'ls' | 'le';
  value: ValueOf<T>;
}

export interface LikeInterface<T extends BaseTableType> extends BaseFilter<T> {
  operation: 'like';
  value: RegExp;
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

export interface DbSelect<T extends BaseTableType> extends DbBaseRequest {
  action: 'select';
  result?: 'count' | 'data';
  order?: { column: KeyOfObj<T>, type?: 'asc' | 'des' };
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

export interface DbSelectDataResponse<T extends BaseTableType> extends DbBaseResponse {
  action: 'select';
  result: Array<T>;
}

export interface DbSelectCountResponse extends DbBaseResponse {
  action: 'select';
  count: number;
}

export type DbSelectResponse<T extends BaseTableType> = DbSelectDataResponse<T> | DbSelectCountResponse;

export interface DbErrorResponse extends DbBaseResponse {
  action: 'error';
  message: string;
}

export type DbResponse<T extends BaseTableType> =
  DbUpdateResponse
  | DbDeleteResponse
  | DbSelectResponse<T>
  | DbErrorResponse;


