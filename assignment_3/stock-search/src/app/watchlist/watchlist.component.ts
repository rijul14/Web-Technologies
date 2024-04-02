import { Component } from '@angular/core';
import {ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {MatProgressSpinnerModule } from '@angular/material/progress-spinner';


interface WatchlistItem {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  percentChange: number;
}


@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [RouterModule, CommonModule, MatProgressSpinnerModule],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent {
  // Component logic goes here
  watchlist: WatchlistItem[] = []; // Replace any with your watchlist item type
  isLoading: boolean = true;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.fetchWatchlist();
  }

  fetchWatchlist() {
    this.http.get<WatchlistItem[]>(`/api/watchlist`).subscribe({
      next: (data) => {
        this.watchlist = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching watchlist', error);
      }
    });
  }

  removeFromWatchlist(ticker: string, event: MouseEvent) {
    event.stopPropagation(); 
    this.http.delete(`/api/watchlist?ticker=${ticker}`).subscribe({
      next: () => {
        this.watchlist = this.watchlist.filter(item => item.ticker !== ticker);
      },
      error: (error) => {
        console.error('Error removing item from watchlist', error);
      }
    });
  }

  navigateToSearch(ticker: string) {
    this.router.navigate(['/search', ticker]).then(() => {
      console.log('Navigation to search page completed.');
    });
  }
}