import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DbRequest, NonEmptyArray} from "./indexed-db/indexed-db.model";
import {IndexedDbService} from "./indexed-db/service/indexed-db.service";
import {AppDB, onSelectRequest} from "./indexed-db/indexed-db.util";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'angular-db';

  constructor(private indexedDbService: IndexedDbService) {
  }

  public madeQuery() {
    const elementNumber = 100_000;
    const id = (Math.random() * elementNumber * 100).toFixed(0);

    const message: { d: Date; name: string; n: number; info: string } = {
      name: 'hello_' + (Math.random() * 10000).toFixed(0),
      info: 'test',
      n: 44,
      d: new Date()
    };

    const search: DbRequest<typeof message> = {
      action: 'select',
      table: 'data',
      filters: [{operation: 'eq', column: 'n', value: 44}]
    }


    const messages = new Array(elementNumber).fill({}).map(() => ({
      name: 'hello_' + (Math.random() * elementNumber * 100).toFixed(0),
      info: 'test',
      n: +(Math.random() * 1000).toFixed(0),
      d: new Date()
    })) as NonEmptyArray<typeof message>;

    const request: DbRequest<typeof message> = {
      keyName: 'name',
      action: 'merge',
      table: 'data',
      elements: messages
    }
    console.log('Start');
    console.time("My Timer " + id);
    this.indexedDbService.dbRequest(request).subscribe({
      next: (response) => {
        console.log('Done');
        console.log({response});
        console.timeEnd("My Timer " + id);
      }, error: error => {
        console.error(error);
        console.timeEnd("My Timer " + id);
      }
    });
  }

  public search(): void {
    const elementNumber = 100_000;
    const id = (Math.random() * elementNumber * 100).toFixed(0);
    const message = {
      name: 'hello_' + (Math.random() * 10000).toFixed(0),
      info: 'test',
      n: 44,
      d: new Date()
    };

    const search: DbRequest<typeof message> = {
      action: 'select',
      table: 'data',
      filters: [{operation: 'eq', column: 'n', value: 44}]
    }
    console.time("My Timer " + id);
    this.indexedDbService.dbRequest(search).subscribe({
      next: (response) => {
        console.log('Done');
        console.log({response});
        console.timeEnd("My Timer " + id);
      }, error: error => {
        console.error(error);
        console.timeEnd("My Timer " + id);
      }
    });

  }

  public async directSearch(): Promise<void> {
    const table = AppDB.getDb().getTable('data');
    const query = table.where({n: 44, info: 'test'})
    const r = await query.toArray()
    console.log({r});
  }

  public async searchLib() {
    const search: DbRequest<{ d: Date; name: string; n: number; info: string }> = {
      action: 'select',
      table: 'data',
      filters: [{operation: 'eq', column: 'n', value: 44}]
    }
    const response = await onSelectRequest(search);
    console.log({response});
  }
}
