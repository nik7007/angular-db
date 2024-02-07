import {Injectable} from '@angular/core';
import {BaseTableType, DbRequest} from "../indexed-db.model";
import {Observable} from "rxjs";
import {ThreadPool} from "../../utility/thread-pool.utility";

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private pool?: ThreadPool<unknown, void>;

  constructor() {
  }

  public dbRequest<T extends BaseTableType>(request: DbRequest<T>): Observable<void> {
    if (!this.pool) {
      this.pool = new ThreadPool<unknown, void>(() => this.workerProvider(), 5);
    }
    return this.pool.execAction(request);
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
