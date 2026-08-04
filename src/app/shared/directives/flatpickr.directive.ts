import { Directive, ElementRef, OnDestroy, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';

@Directive({
  selector: '[appFlatpickr]',
  standalone: true
})
export class FlatpickrDirective implements AfterViewInit, OnDestroy {
  @Input() appFlatpickr: any;
  @Input() flatpickrOptions: any = {};
  @Output() dateChange = new EventEmitter<string>();
  private fp: any;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const defaultOptions = {
      locale: Spanish,
      altInput: true,
      altFormat: "d \\de F, Y",
      dateFormat: "Y-m-d",
      defaultDate: this.appFlatpickr || null,
      onChange: (selectedDates: any[], dateStr: string) => {
        this.dateChange.emit(selectedDates[0] ? selectedDates[0].toISOString() : '');
      }
    };

    const finalOptions = { ...defaultOptions, ...this.flatpickrOptions };
    this.fp = flatpickr(this.el.nativeElement, finalOptions);
  }

  ngOnDestroy() {
    if (this.fp) {
      this.fp.destroy();
    }
  }
}
