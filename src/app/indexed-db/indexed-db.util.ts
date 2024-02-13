import Dexie, {Collection, IndexableType, IndexableTypeArrayReadonly, Table, WhereClause} from "dexie";
import {
  BaseFilter,
  BaseTableType,
  CollectionFilter,
  DbDelete,
  DbDeleteResponse,
  DbInsert,
  DbRequest,
  DbResponse,
  DbSelect,
  DbSelectResponse,
  DbUpdate,
  DbUpdateResponse,
  Filter,
  FiltersOperation,
  LikeInterface,
  NonEmptyArray,
  SchemaVersion,
  ValueFilter,
  ValueOf
} from "./indexed-db.model";

export class AppDB extends Dexie {
  private static db?: AppDB;

  constructor(dbName: string, schemaVersions?: Array<SchemaVersion>) {
    super(dbName);
    if (!schemaVersions?.length) {
      return;
    }

    for (const value of schemaVersions) {
      const {version, schema, upgrade} = value;
      const dbVersion = this.version(version).stores(schema);
      if (upgrade) {
        dbVersion.upgrade(upgrade);
      }
    }
  }

  public static getDb(): AppDB {
    if (!AppDB.db) {
      AppDB.db = new AppDB('app-db', [{version: 1, schema: {data: 'name'}}]);
    }
    return AppDB.db;

  }

  public static closeAndClean(): void {
    AppDB.db?.close();
    AppDB.db = undefined;
  }

  public getTable<T extends BaseTableType, K = IndexableType>(tableName: string): Table<T, K> {
    const db = this as unknown as Record<string, Table<T, K>>;
    return db[tableName];
  }
}

export async function onRequest<T extends BaseTableType>(request: DbRequest<T>): Promise<DbResponse<T> | null> {
  if (request.action === 'insert') {
    return await onInsertRequest(request);
  }
  if (request.action === 'update' || request.action === 'merge') {
    return await onUpdateRequest(request);
  }

  if (request.action === 'delete') {
    return await odDeleteRequest(request);
  }
  if (request.action === 'select') {
    return await onSelectRequest<T>(request);
  }

  return null;
}

function elementUpdated(element: IndexableType): number {
  if (Array.isArray(element)) {
    return element.length;
  }

  return 1;
}

export function onInsertRequest<T extends BaseTableType>(request: DbInsert<T>): Promise<DbUpdateResponse> {
  const db = AppDB.getDb();
  const {table, elements} = request;

  const dataTable = db.getTable(table);

  return new Promise<DbUpdateResponse>((resolve, reject) => {
    db.transaction('rw', dataTable, async () => {
      try {
        let elementChanged = 0;
        if (Array.isArray(elements)) {
          elementChanged += elementUpdated(await dataTable.bulkAdd(elements));

        } else {
          elementChanged += elementUpdated(await dataTable.add(elements));
        }
        resolve({action: request.action, table: request.table, elementChanged});
      } catch (e) {
        reject(e);
      }
    });
  })
}

export function onUpdateRequest<T extends BaseTableType>(request: DbUpdate<T>): Promise<DbUpdateResponse> {
  const db = AppDB.getDb();
  const {keyName, table, elements} = request;

  const dataTable = db.getTable(table);
  return new Promise<DbUpdateResponse>(async (resolve, reject) => {

    db.transaction('rw', dataTable, async () => {
      try {
        let elementChanged = 0;
        if (request.action === 'merge') {
          if (Array.isArray(elements)) {
            elementChanged += elementUpdated(await dataTable.bulkPut(elements));
          } else {
            elementChanged += elementUpdated(await dataTable.put(elements));
          }
        } else {
          if (Array.isArray(elements)) {
            await Promise.all(elements.map(async (element) =>
              elementChanged += elementUpdated(await dataTable.update(element[keyName], element))
            ));
          } else {
            elementChanged += elementUpdated(await dataTable.update(elements[keyName], elements));
          }
        }
        resolve({action: request.action, table: request.table, elementChanged});
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function odDeleteRequest<T extends BaseTableType>(request: DbDelete<T>): Promise<DbDeleteResponse> {
  const db = AppDB.getDb();
  const {table, key} = request;

  const dataTable = db.getTable(table);

  return new Promise<DbDeleteResponse>((resolve, reject) => {
    db.transaction('rw', dataTable, async () => {
      try {
        if (Array.isArray(key)) {
          await dataTable.bulkDelete(key as Array<IndexableType>);
        } else {
          await dataTable.delete(key);
        }
        resolve({action: request.action, table: request.table});
      } catch (e) {
        reject(e);
      }
    });
  })
}

function splitFilters<T extends BaseTableType, D extends BaseFilter<T>>(filters: Array<Filter<T>>, operation: FiltersOperation): {
  filtered: Array<D>,
  remains: Array<Filter<T>>
} {
  const filtered = filters.filter(f => f.operation === operation) as unknown as Array<D>;
  const remains = filters.filter(f => f.operation !== operation);
  return {filtered, remains};
}

function addValueFilter<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                    filters: Array<ValueFilter<T>>,
                                                                    queryTableFn: (whereClause: WhereClause<T, K>, values: IndexableTypeArrayReadonly) => Collection<T, K>,
                                                                    queryCollectionFn: (element: ValueOf<T>, value: ValueOf<T>) => boolean): Collection<T, K> | Table<T, K> {
  if (!filters.length) {
    return query;
  }

  const columns: Array<K> = [];
  const values: Array<ValueOf<T>> = [];
  filters.forEach(filter => {
    columns.push(filter.column as K);
    values.push(filter.value);
  });

  if ('where' in query) {
    return queryTableFn((query.where(columns) as unknown as WhereClause<T, K>), values as IndexableTypeArrayReadonly);
  }
  return query.filter(element => columns.every((colName, index) => queryCollectionFn(element[colName as string] as ValueOf<T>, values[index])));
}

function addEqFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                  filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.equals(values)
    , (element, value) => element === value);
}

function addNotEqFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                     filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.notEqual(values),
    (element, value) => element !== value);
}

function addGtFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                  filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.above(values),
    (element, value) => element > value);
}

function addGeFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                  filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.aboveOrEqual(values),
    (element, value) => element >= value);
}


function addLsFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                  filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.below(values),
    (element, value) => element < value);
}

function addLeFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                  filters: Array<ValueFilter<T>>): Collection<T, K> | Table<T, K> {
  return addValueFilter(query, filters,
    (whereClause, values) => whereClause.belowOrEqual(values),
    (element, value) => element <= value);
}

function addLikeFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>, filters: Array<LikeInterface<T>>): Collection<T, K> | Table<T, K> {
  if (!filters.length) {
    return query;
  }
  const columns: Array<K> = [];
  const values: Array<RegExp> = [];
  filters.forEach(filter => {
    columns.push(filter.column as K);
    values.push(filter.value);
  });

  return query.filter(obj =>
    columns.every((column, index) => {
      const element = obj[column as string] as string;
      const value = values[index];
      return value.test(element);
    })
  );
}

function addCollectionFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>,
                                                                          filters: Array<CollectionFilter<T>>,
                                                                          queryTableFn: (whereClause: WhereClause<T, K>, values: NonEmptyArray<ValueOf<T>>) => Collection<T, K>,
                                                                          queryCollectionFn: (element: ValueOf<T>, value: ValueOf<T>) => boolean): Collection<T, K> | Table<T, K> {
  if (!filters.length) {
    return query;
  }
  for (let index = 0; index < filters.length; index++) {
    const filter = filters[index];
    const fieldName = filter.column as string;
    const values = filter.values;

    if ('where' in query && index === 0) {
      query = queryTableFn((query.where(fieldName) as unknown as WhereClause<T, K>), values)
    }
    query = query.filter(obj => {
      const value = obj[fieldName] as ValueOf<T>;
      for (const val of values) {
        if (queryCollectionFn(value, val)) {
          return true;
        }
      }
      return false;
    })
  }

  return query;
}


function addInFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>, filters: Array<CollectionFilter<T>>): Collection<T, K> | Table<T, K> {
  return addCollectionFilters(query, filters,
    (whereClause, values) => whereClause.anyOf(values),
    (element, value) => element === value)
}

function addNotInFilters<T extends BaseTableType, K = IndexableType>(query: Table<T, K> | Collection<T, K>, filters: Array<CollectionFilter<T>>): Collection<T, K> | Table<T, K> {
  return addCollectionFilters(query, filters,
    (whereClause, values) => whereClause.noneOf(values),
    (element, value) => element !== value)
}

const operations: Array<{ operation: FiltersOperation, fn: Function }> = [
  {
    operation: 'eq',
    fn: addEqFilters,
  }, {
    operation: 'not_eq',
    fn: addNotEqFilters,
  }, {
    operation: 'gt',
    fn: addGtFilters,
  }, {
    operation: 'ge',
    fn: addGeFilters,
  }, {
    operation: 'ls',
    fn: addLsFilters,
  }, {
    operation: 'le',
    fn: addLeFilters,
  }, {
    operation: 'in',
    fn: addInFilters,
  }, {
    operation: 'not_in',
    fn: addNotInFilters,
  }, {
    operation: 'like',
    fn: addLikeFilters,
  },
] as const;

function addFilters<T extends BaseTableType, K = IndexableType>(table: Table<T, K>, filters: NonEmptyArray<Filter<T>>): Collection<T, K> | Table<T, K> {

  let query: Table<T, K> | Collection<T, K> = table;
  let remainingFilters: Array<Filter<T>> = filters;
  for (const operation of operations) {
    const operationFilter = splitFilters(remainingFilters, operation.operation);
    query = operation.fn(query, operationFilter.filtered);
    remainingFilters = operationFilter.remains;
  }
  return table;
}

export async function onSelectRequest<T extends BaseTableType, K = IndexableType>(request: DbSelect<T>): Promise<DbSelectResponse<T>> {
  const db = AppDB.getDb();
  const {table, result, order, filters, paginator} = request;

  const tableData = db.getTable(table) as Table<T, K>;
  let query: Collection<T, K> | Table<T, K> = tableData;
  if (filters) {
    query = addFilters(tableData, filters);
  }

  if (result === 'count') {
    const count = await query.count();
    return {action: 'select', count, table};
  }

  let res: Array<T> | null = null;
  if (order) {
    if (order.type === 'des') {
      query = query.reverse()
    }
    if ('orderBy' in query) {
      query = query.orderBy(order.column as string)
    } else if ('sortBy') {
      res = await query.sortBy(order.column as string)
    }
  }

  if (paginator) {
    const {page, pageSize} = paginator;

    if (!res) {
      query = query.offset(page * pageSize).limit(pageSize);
    } else {
      res = res.slice(page * pageSize, (page + 1) * pageSize);
    }
  }

  if (!res) {
    res = await query.toArray();
  }

  return {action: 'select', table, result: res}
}
