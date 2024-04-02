import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Observable, Subject, of, finalize, startWith } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, takeUntil, tap, catchError, filter } from 'rxjs/operators';
import { NavigationEnd, RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {MatOptionModule} from '@angular/material/core';
import { Router } from '@angular/router';
import { SearchComponent } from './search/search.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { RouterModule } from '@angular/router';
import { SearchService } from './search.service';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';


interface ApiResponse {
  count: number;
  result: any[]; // Replace `any[]` with a more specific type if you know the structure of your result items
}

interface ProfileResponse {
  exchange: string;
  ipo: string;
  name: string;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  imports: [
    RouterOutlet,
    CommonModule, // Now explicitly importing CommonModule
    ReactiveFormsModule, // Needed for formControl
    MatAutocompleteModule, // For mat-autocomplete
    MatOptionModule, // For mat-option
    MatProgressSpinnerModule, // For mat-spinner
    HttpClientModule,
    SearchComponent,
    WatchlistComponent,
    PortfolioComponent,
    RouterModule
  ],
})


export class AppComponent implements OnDestroy {
  @ViewChild('autoTrigger') autoTrigger!: MatAutocompleteTrigger;
  title = 'stock-search';
  searchControl = new FormControl();
  results$: Observable<any>;
  submittedQuery: string | null = null;
  isLoading = false; // Add this line
  private unsubscribe$ = new Subject<void>();
  searchSubmitted = false; 
  showBlankError = false; 
  showInvalidError = false;
  isSearchPage: boolean = false;
  isHomeRoute = true;
  autocompleteEnabled = true;
  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(private http: HttpClient, public searchService: SearchService, private router: Router) {
    this.searchControl = this.searchService.searchControl;
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntil(this.unsubscribe$)
    ).subscribe(event => {
      // Set isHomeRoute to true if we're on the root path
      this.isHomeRoute = event.urlAfterRedirects === '/';
      this.isSearchPage = event.urlAfterRedirects.startsWith('/search');
    });
    
    this.results$ = this.searchControl.valueChanges.pipe(
      debounceTime(300), // wait for a pause in typing
      distinctUntilChanged(), // only continue if the value is different
      tap(() => {
        this.autocompleteEnabled = true; // Re-enable autocomplete when typing
      }),
      switchMap(term => {
        if (!term) {
          return of([]);
        }
        return this.search(term).pipe(
          startWith([{ loading: true }]), // Emit loading state immediately
        );
      }),
      takeUntil(this.unsubscribe$)
    );
  }

  ngOnInit() {
    this.searchService.searchTrigger$.subscribe(ticker => {
      if (ticker) {
        this.searchControl.setValue(ticker);
        this.onSearch(ticker);
      }
    });
  }

  navigate(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  onSearch(eventOrTicker?: Event | string): void {
    // If event is provided, prevent the default form submission behavior.
    this.searchService.searchControl.valueChanges.subscribe(value => {
      console.log("Search control updated to:", value);
    });
    if (eventOrTicker instanceof Event) {
      console.log('HBFHSBDFKHBSDKHFBSHDKF');
      eventOrTicker.preventDefault();
    }
  
    let ticker: string;
    if (typeof eventOrTicker === 'string') {
      ticker = eventOrTicker.toUpperCase();
      this.autocompleteEnabled = false;
    } else {
      const value = this.searchControl.value;
      ticker = (typeof value === 'object' && value !== null && 'symbol' in value)
        ? value.symbol.toUpperCase()
        : typeof value === 'string'
        ? value.toUpperCase()
        : '';
      this.autocompleteEnabled = false;
    }
  
    if (!ticker) {
      this.showBlankError = true;
      console.error("No ticker provided for the search.");
      return;
    }

    this.showBlankError = false;
    this.showInvalidError = false;
    // this.searchInput.nativeElement.setValue(ticker);

    this.http.get<ProfileResponse>(`/api/profile?term=${ticker}`).subscribe({
      next: (data) => {
        if (Object.keys(data).length === 0) {
          this.showInvalidError = true;
          console.log('No data found for ticker:', ticker);
          return;
        } 
        if (this.searchInput && this.searchInput.nativeElement) {
          this.searchInput.nativeElement.value = ticker;
        }
        if (this.autoTrigger) {
          this.autoTrigger.closePanel();
        }
                this.router.navigate(['/search', ticker]).then(() => {
          console.log('Navigation to search page completed.');
          // Further actions after navigation, if necessary
        });
  
        // Clear error message, if any, and set the submitted query
        this.submittedQuery = ticker;
        console.log('Search submitted:', ticker);
      },
      error: (error) => {
        this.showInvalidError = true;
        console.error('We need to show the wrong ticker message', error);
      }
    });

    // Clear error message, if any
    this.showBlankError = false;
    this.showInvalidError = false;
    this.autocompleteEnabled = false;
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.blur();
    }
  }

  // Method to clear the search text and any displayed content
  clearText(): void {
    this.searchService.clearSearch();
    this.submittedQuery = null;
    this.isSearchPage = true;
    this.isHomeRoute = false;
    this.router.navigate(['/']).then(() => {
      console.log('Navigated to home');
    });
  }

  private search(term: string): Observable<any> {
    this.isLoading = true; // Start loading
    if (term === '') {
      this.isLoading = false;
      return new Observable(subscriber => subscriber.next([])); // Return empty array if search term is empty
    } else {
      console.log(term);
      // return of([
      //   { formatted: 'AAPL | Apple Inc.', symbol: 'AAPL', description: 'Apple Inc.' },
      //   { formatted: 'GOOGL | Alphabet Inc.', symbol: 'GOOGL', description: 'Alphabet Inc.' }
      // ]);
      return this.http.get<ApiResponse>(`/api/autocomplete`, { params: { term } })
      .pipe(
        map(response => response['result'] || []),
        tap(results => {
          // Log the results received from the backend
          console.log("Received results from Angular:", results);
        }),
        catchError(error => {
          console.error('Error fetching data:', error);
          return of([]); // Return an empty array in case of an error
        })
      );
    }
  }

  displayFn(stock: any): string {
    console.log('inside displayFn: ' + stock);
    return stock && stock.symbol ? stock.symbol : '';
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
