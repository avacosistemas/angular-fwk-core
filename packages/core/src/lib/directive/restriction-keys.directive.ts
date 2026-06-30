import { Directive, HostListener, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[restrictionKeys]',
    standalone: true
})
export class RestrictionKeysDirective {
    @Input('restrictionKeys') inputType: string = '';

    constructor(public el: ElementRef) { }

    @HostListener('keypress', ['$event'])
    onInput(event: KeyboardEvent): void {
        if (this.inputType) {
            const inputChar = event.key;
            const regex = new RegExp(this.inputType);

            if (!regex.test(inputChar)) {
                event.preventDefault();
            }
        }
    }
}