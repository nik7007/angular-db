import {Injectable} from '@angular/core';
import {BaseTableType, DbRequest} from "../indexed-db.model";
import {onRequest} from "../indexed-db.util";
import {Observable} from "rxjs";
import {fromPromise} from "rxjs/internal/observable/innerFrom";

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private worker?: Worker;

  constructor() {
  }

  public dbRequest<T extends BaseTableType>(request: DbRequest<T>): Observable<void> {
    if (typeof Worker === 'undefined') {
      return fromPromise(onRequest(request));
    }
    if (!this.worker) {
      this.worker = new Worker(new URL('./../worker/indexed-db.worker', import.meta.url));
    }
    const worker = this.worker;
    worker.postMessage(request);
    return new Observable<void>(observer => {
      worker.onmessage = (event: MessageEvent) => {
        observer.next(event.data);
        observer.complete();
      };
    });

  }
}
