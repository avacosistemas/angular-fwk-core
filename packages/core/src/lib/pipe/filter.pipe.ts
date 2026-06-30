import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filter',
    standalone: true
})
export class FilterPipe implements PipeTransform {
    /**
     * @param items 
     * @param searchText 
     * @param propertyName
     */
    transform(items: any[], searchText: string, propertyName: string): any[] {
        if (!items) {
            return [];
        }
        if (!searchText) {
            return items;
        }
        searchText = searchText.toLowerCase();

        return items.filter(it => {
            return it[propertyName] && it[propertyName].toLowerCase().includes(searchText);
        });
    }
}