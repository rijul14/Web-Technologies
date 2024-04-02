import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private searchSubject = new BehaviorSubject<string>('');
  public searchControl = new FormControl(''); 

  triggerSearch(ticker: string) {
    console.log('my next search is ' + ticker);
    this.searchSubject.next(ticker);
    this.searchControl.setValue(ticker, { emitEvent: true }); 
  }

  get searchTrigger$() {
    return this.searchSubject.asObservable();
  }

  clearSearch() {
    this.searchSubject.next('');
    this.searchControl.setValue('');
  }
}
