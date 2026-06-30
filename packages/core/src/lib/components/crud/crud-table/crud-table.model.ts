import { Observable, Subscriber } from 'rxjs';

export class Row {
    rowNumber: number;
    obj: any;
    statusChanges: Observable<Row>;
    selectable: boolean;

    private _select: boolean;
    private observer!: Subscriber<Row>;

    constructor(obj: any, rowNumber: number, select: boolean, selectable: boolean) {
        this.obj = obj;
        this.rowNumber = rowNumber;
        this._select = select;
        this.selectable = selectable;

        this.statusChanges = new Observable<Row>((observer) => {
            this.observer = observer;
        });
    }

    get select(): boolean {
        return this._select;
    }

    set select(select: boolean) {
        if (this.selectable) {
            if (this._select !== select) {
                this._select = select;
                if (this.observer) {
                    this.observer.next(this);
                }
            }
        }
    }
}

export class StatusTable<E> {
    private _rows: Row[] = [];
    private observer!: Subscriber<StatusTable<E>>;

    statusChanges = new Observable<StatusTable<E>>((observer) => {
        this.observer = observer;
    });

    set rows(rows: Row[]) {
        this._rows = rows;
        this._rows.forEach((row) => {
            row.statusChanges.subscribe(() => {
                if (this.observer) {
                    this.observer.next(this);
                }
            });
        });
        if (this.observer) {
            this.observer.next(this);
        }
    }

    get selects(): E[] {
        if (this._rows) {
            return this._rows
                .filter(e => e.select)
                .map(e => e.obj as E);
        }
        return [];
    }

    existSelectedItems(): boolean {
        return this.selects.length > 0;
    }
}