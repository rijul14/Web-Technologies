import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LastSearchService {
    private latestData: any;
    private lastSearchedTicker: string | null = null;

  setLastSearchedTicker(ticker: string): void {
    this.lastSearchedTicker = ticker;
  }

  getLastSearchedTicker(): string | null {
    return this.lastSearchedTicker;
  }


  setData(ticker: string, data: any) {
    this.latestData = data;
  }

  getData(ticker: string): any {
    return this.latestData;
  }

  hasData(ticker: string): boolean {
    return this.lastSearchedTicker === ticker && this.latestData != null;
  }
}
