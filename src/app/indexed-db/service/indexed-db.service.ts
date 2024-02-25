import {Injectable} from '@angular/core';
import {BaseTableType, DbRequest, DbResponse} from "../indexed-db.model";
import {from, Observable} from "rxjs";
import {ThreadPool} from "../../utility/thread-pool.utility";
import {onRequest} from "../indexed-db.util";

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private pool?: ThreadPool<DbRequest<BaseTableType>, DbResponse<BaseTableType> | null>;

  constructor() {
  }

  public dbRequest<T extends BaseTableType>(request: DbRequest<T>): Observable<DbResponse<T> | null> {
    try {
      if (!this.pool) {
        this.pool = new ThreadPool<DbRequest<BaseTableType>, DbResponse<BaseTableType> | null>(() => this.workerProvider(), 5);
      }
      return this.pool.execAction(request as DbRequest<BaseTableType>) as Observable<DbResponse<T> | null>;

    } catch (e) {
      return from(onRequest(request));
    }

  }

  private workerProvider(): Observable<Worker> {
    const w = new Worker(new URL('./../worker/indexed-db.worker', import.meta.url));
    const obs = new Observable<Worker>(subscriber => {
      w.onmessage = () => {
        if (subscriber.closed) {
          return;
        }
        subscriber.next(w);
        subscriber.complete();
      }
    })
    w.postMessage(null);

    return obs;
  }

}
