import {Observable, ReplaySubject, Subscription, zip} from "rxjs";

interface PoolAction<I, O> {
  action: I;
  observer: ReplaySubject<O>;
}

export class ThreadPool<I, O> {

  private readonly actionsQueue = new ReplaySubject<PoolAction<I, O>>();
  private readonly workersQueue = new ReplaySubject<Worker>();

  private readonly subscription?: Subscription;

  private readonly workers: Array<Worker> = [];

  constructor(private readonly workerProvider: () => Observable<Worker>, private readonly threadMaxNumber: number) {
    if (typeof Worker === 'undefined') {
      throw new Error('Your system does not support web-workers!');
    }

    this.subscription = zip(this.actionsQueue.asObservable(), this.workersQueue.asObservable()).subscribe(([actionPool, worker]) => {
      const {action, observer} = actionPool;
      worker.onmessage = (event: MessageEvent) => {
        observer.next(event.data);
        observer.complete();
        this.workersQueue.next(worker);
      };
      worker.postMessage(action);
    });
  }

  public execAction(action: I): Observable<O> {
    const observer = new ReplaySubject<O>();
    this.actionsQueue.next({action, observer});
    this.addWorker();
    return observer.asObservable();
  }

  public clear(): void {
    this.subscription?.unsubscribe();
    this.actionsQueue.complete();
    this.workersQueue.complete();
    if (!this.workers?.length) {
      return;
    }

    for (const worker of this.workers) {

      try {
        worker.terminate();
      } catch (e) {
        console.error(e);
      }

    }
  }

  private addWorker(): void {
    if (this.workers.length >= this.threadMaxNumber) {
      return;
    }
    this.workerProvider().subscribe(worker => {
      this.workers.push(worker);
      this.workersQueue.next(worker);
    });
  }
}

