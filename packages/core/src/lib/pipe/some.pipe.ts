import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'some',
    standalone: true
})
export class SomePipe implements PipeTransform {
    transform(items: any[], predicate: (item: any, ...args: any[]) => boolean, ...args: any[]): boolean {
        if (!items || !predicate) { return false; }
        return items.some(item => predicate(item, ...args));
    }
}