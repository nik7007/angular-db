import Dexie, {IndexableType, Table} from "dexie";
import {BaseTableType, DbDelete, DbInsert, DbRequest, DbUpdate, SchemaVersion} from "./indexed-db.model";

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

export async function onRequest<T extends BaseTableType>(request: DbRequest<T>): Promise<void> {
  if (request.action === 'insert') {
    await onInsertRequest(request);
  }
  if (request.action === 'update' || request.action === 'merge') {
    await onUpdateRequest(request);
  }

  if (request.action === 'delete') {
    await odDeleteRequest(request);
  }
}

export function onInsertRequest<T extends BaseTableType>(request: DbInsert<T>): Promise<void> {
  const db = AppDB.getDb();
  const {table, elements} = request;

  const dataTable = db.getTable(table);

  return new Promise<void>((resolve, reject) => {
    db.transaction('rw', dataTable, async () => {
      try {
        if (Array.isArray(elements)) {
          await dataTable.bulkAdd(elements);
        } else {
          await dataTable.add(elements);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  })
}

export function onUpdateRequest<T extends BaseTableType>(request: DbUpdate<T>): Promise<void> {
  const db = AppDB.getDb();
  const {keyName, table, elements} = request;

  const dataTable = db.getTable(table);
  return new Promise<void>(async (resolve, reject) => {

    db.transaction('rw', dataTable, async () => {
      try {
        if (request.action === 'merge') {
          if (Array.isArray(elements)) {
            await dataTable.bulkPut(elements);
          } else {
            await dataTable.put(elements);
          }
        } else {
          if (Array.isArray(elements)) {
            await Promise.all(elements.map(async (element) =>
              await dataTable.update(element[keyName], element)
            ));
          } else {
            await dataTable.update(elements[keyName], elements);
          }
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function odDeleteRequest<T extends BaseTableType>(request: DbDelete<T>): Promise<void> {
  const db = AppDB.getDb();
  const {table, key} = request;

  const dataTable = db.getTable(table);

  return new Promise<void>((resolve, reject) => {
    db.transaction('rw', dataTable, async () => {
      try {
        if (Array.isArray(key)) {
          await dataTable.bulkDelete(key as Array<IndexableType>);
        } else {
          await dataTable.delete(key);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  })
}
