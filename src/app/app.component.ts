import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DbRequest, NonEmptyArray} from "./indexed-db/indexed-db.model";
import {IndexedDbService} from "./indexed-db/service/indexed-db.service";

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
    console.log('Start');
    console.time("My Timer");
    const message = {
      name: 'hello_' + (Math.random() * 10000).toFixed(0),
      info: 'test',
      n: 44
    };

    const elementNumber = 100_000;

    const messages = new Array(elementNumber).fill({}).map(() => ({
      name: 'hello_' + (Math.random() * elementNumber * 100).toFixed(0),
      info: 'test',
      n: 44
    })) as NonEmptyArray<typeof message>;

    const request: DbRequest<{ name: string, info: string, n: number }> = {
      keyName: 'name',
      action: 'merge',
      table: 'data',
      elements: messages
    }
    this.indexedDbService.dbRequest(request).subscribe(() => {
      console.log('Done');
      console.timeEnd("My Timer");
    });
  }
}
