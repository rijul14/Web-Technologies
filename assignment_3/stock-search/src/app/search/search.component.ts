import { Component, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import { SearchService } from '.././search.service';
import {MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatDialogConfig, MatDialogModule } from '@angular/material/dialog';
import * as Highcharts from 'highcharts';
import HC_exporting from 'highcharts/modules/exporting';
import { MatDialog } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { DialogContentComponent } from '../dialog-content/dialog-content.component';
import { DOCUMENT } from '@angular/common';
import { LastSearchService } from '.././last-search.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

HC_exporting(Highcharts); // This module is for the exporting feature

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

interface QuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Opening price
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface NewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface Sentiment {
  symbol: string;
  year: number;
  month: number;
  change: number;
  mspr: number;
}

interface Rec {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface Earnings {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

declare module "highcharts" {
  export interface Point {
      surprise?: number; // Now each Point can optionally have a surprise property
  }
}


@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterModule,
  CommonModule, MatTabsModule, MatProgressSpinnerModule, HighchartsChartModule, MatDialogModule],
  providers: [DatePipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})

export class SearchComponent implements OnInit, OnDestroy{
  // Component logic goes here
  private unsubscribe$ = new Subject<void>();
  private quoteUpdateInterval?: number;
  tick!: string;
  profileData: ProfileResponse = {
    exchange: " ",
    ipo: " ",
    name: " ",
    ticker: " ",
    weburl: " ",
    logo: " ",
    finnhubIndustry: ""
  }; // Use the ProfileResponse interface
  quoteData: QuoteResponse = {
    c: 0,
    d: 0,
    dp: 0,
    h: 0,
    l: 0,
    o: 0,
    pc: 0,
    t: 0 // Unix epoch time of the market close
  };
  isFavorite: boolean = false;
  isMarketOpen: boolean = false;
  marketStatusMessage: string = '';
  closeDate: Date = new Date();
  currentDateTime: Date = new Date(); 
  peerCompanies: string[] = [];
  isLoading: boolean = true;
  displayContent: boolean = false;
  loadingOperations = 0;
  newsArticles: NewsArticle[] = [];
  sentiments: Sentiment[] = [];
  recs: Rec[] = [];
  earnings: Earnings[] = [];
  showFavoriteMessage: boolean = false;
  showFavRemoveMessage: boolean = false;
  selectedTabIndex = 0;
  private hideMessageTimer: any;

  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor: string = 'chart'; // optional string, defaults to 'chart'
  chartOptions: Highcharts.Options | undefined;  // required
  updateFlag: boolean = false; // optional boolean
  oneToOneFlag: boolean = true; // optional boolean, defaults to false
  runOutsideAngular: boolean = false; 

  chartOptions1: Highcharts.Options | undefined;
  chartOptions2: Highcharts.Options | undefined;

  constructor(private dataService: LastSearchService, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document, private router: Router, public dialog: MatDialog, private route: ActivatedRoute, private http: HttpClient, private datePipe: DatePipe,
    private searchService: SearchService) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      console.log('This should be outputted');
      const ticker = params.get('tick') || '';
      console.log('give me a ticker value please: ' + ticker);
      if (ticker) {
        this.displayContent = true;
        this.tick = ticker;
        this.fetchDataForTicker(ticker);
        this.searchService.triggerSearch(ticker);
      } else {
        const lastTicker = this.dataService.getLastSearchedTicker(); // Assuming you have a method to get the last searched ticker
        if (lastTicker && this.dataService.hasData(lastTicker)) {
          // If there's cached data for the last searched ticker, use it
          this.displayContent = true;
          this.tick = lastTicker;
          this.fetchDataForTicker(lastTicker);
          this.searchService.triggerSearch(lastTicker); // Update search bar with the last ticker value
        } else {
          // Handle the case where there is no ticker in the route and no cached last searched ticker
          this.displayContent = false;
          this.searchService.clearSearch();
        }
      }
    });

    setInterval(() => {
      if (this.tick) { // Ensure there's a ticker present before attempting to update market status or fetch new quote data
        this.updateMarketStatus();
      }
    }, 60000);
  }


  private fetchDataForTicker(ticker: string) {
    if (this.dataService.hasData(ticker)) {
      console.log('about to display some cached data');
      console.log('here it is',this.dataService.getData(ticker));
      // Use cached data
      const data = this.dataService.getData(ticker);
      this.profileData = data.profileData;
      this.quoteData = data.quoteData;
      this.isFavorite = data.isFavorite;
      this.isMarketOpen = data.isMarketOpen;
      this.peerCompanies = data.peerCompanies;
      this.newsArticles = data.newsArticles;
      this.sentiments = data.sentiments;
      this.recs = data.recs;
      this.earnings = data.earnings;
      // set other data properties similarly
      this.marketStatusMessage = data.marketStatusMessage;
      this.isLoading = data.isLoading;
      this.displayContent = data.displayContent;
      this.loadingOperations = data.loadingOperations;
      this.showFavoriteMessage = data.showFavoriteMessage;
      this.showFavRemoveMessage = data.showFavRemoveMessage;
      this.selectedTabIndex = data.selectedTabIndex;
      this.chartOptions = data.chartOptions;  
      this.updateFlag = data.updateFlag; // optional boolean
      this.chartOptions1 = data.chartOptions1; // optional boolean
      this.chartOptions2 = data.chartOptions2; // optional boolean
    } 
    else {
      Promise.all([
        this.checkIfFavorite(),
        this.fetchProfileData(),
        this.fetchQuoteData(),
        this.fetchPeerData(),
        this.fetchNewsArticles(),
        this.fetchInsiderSentiment(),
        this.fetchRecommendationTrends(),
        this.fetchEarnings(),
      // this.updateMarketStatus();
      ]).then(() => {
        const data = { profileData: this.profileData, quoteData: this.quoteData, isFavorite: this.isFavorite,
        isMarketOpen : this.isMarketOpen, peerCompanies: this.peerCompanies, newsArticles: this.newsArticles,
        sentiments: this.sentiments, recs: this.recs,earnings: this.earnings, 
        marketStatusMessage: this.marketStatusMessage,
        isLoading: this.isLoading,
        displayContent: this.displayContent,
        loadingOperations: this.loadingOperations,
        showFavoriteMessage: this.showFavoriteMessage,
        showFavRemoveMessage: this.showFavRemoveMessage,
        selectedTabIndex: this.selectedTabIndex,
        chartOptions: this.chartOptions,
        updateFlag: this.updateFlag, // optional boolean
        chartOptions1: this.chartOptions1,// optional boolean
        chartOptions2: this.chartOptions2};
        console.log('here is the data I will cache',data);
        this.dataService.setData(ticker, data);
        this.dataService.setLastSearchedTicker(ticker);
      }).catch(error => {
        console.error("Error fetching data:", error);
      });
    }
  }

  private updateMarketStatus() {
    // Implement logic to accurately determine if the market is currently open
    const currentTime = new Date().getTime() / 1000;
    const timeDifference = currentTime - this.quoteData.t;
    const marketIsOpen = timeDifference < 60/* logic to determine market status */;
    this.isMarketOpen = marketIsOpen;
    
    if (marketIsOpen && !this.quoteUpdateInterval) {
      this.quoteUpdateInterval = window.setInterval(() => this.fetchQuoteData(), 15000); // 15 seconds
    } else if (!marketIsOpen && this.quoteUpdateInterval) {
      clearInterval(this.quoteUpdateInterval);
      this.quoteUpdateInterval = undefined;
    }
  }

  private fetchProfileData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<ProfileResponse>(`/api/profile?term=${this.tick}`).subscribe({
        next: (data) => {
          this.profileData = data;
          this.checkLoadingComplete();
          resolve();
        },
        error: (error) => {
          console.error('There was an error fetching the profile data!', error);
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }


  fetchQuoteData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<QuoteResponse>(`/api/quote?term=${this.tick}`).subscribe({
        next: (data) => {
          this.quoteData = data;
          console.log('THIS IS MARKET CLOSE' + this.quoteData.t);
          this.calculateMarketStatus();
          this.checkLoadingComplete();
          this.fetchChartData();
          resolve();
        },
        error: (error) => {
          console.error('There was an error fetching the quote data!', error)
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }

  calculateMarketStatus() {
    if (this.quoteData) {
      const currentTime = new Date().getTime() / 1000;
      const timeDifference = currentTime - this.quoteData.t;
      this.isMarketOpen = timeDifference < 60;
      this.marketStatusMessage = this.isMarketOpen 
        ? 'Market is Open' 
        : 'Market Closed on ' +
        this.datePipe.transform(new Date(this.quoteData.t * 1000), 'yyyy-MM-dd HH:mm:ss');
    }
  }

  checkIfFavorite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ isFavorite: boolean }>(`/api/watchlist-item?term=${this.tick}`).subscribe({
        next: (response) => {
          this.isFavorite = response.isFavorite;
          resolve();
        },
        error: (error) => {
          console.error('Error fetching watchlist item', error);
          reject(error);
        }
      });
    });
  }
  

  toggleFavorite() {
    if (this.isFavorite) {
      this.http.delete(`/api/watchlist/?ticker=${this.profileData.ticker}`).subscribe({
        next: () => {
          this.isFavorite = false; // Update isFavorite
          this.showFavRemoveMessage = true;
          this.showFavoriteMessage = false;
          this.startHideMessageTimer(() => this.showFavRemoveMessage = false);
          console.log('Removed from favorites');
        },
        error: (error) => console.error('Error removing favorite', error)
      });
    } else {
      // If it's not a favorite, we should add it to the watchlist
      const metadata = {
        name: this.profileData.name,
        currentPrice: this.quoteData.c,
        change: this.quoteData.d,
        percentChange: this.quoteData.dp
      };
  
      this.http.post('/api/favorites', { ticker: this.tick, metadata })
      .subscribe({
        next: () => {
          this.isFavorite = true; // Update isFavorite
          this.showFavoriteMessage = true;
          this.showFavRemoveMessage = false;
          this.startHideMessageTimer(() => this.showFavoriteMessage = false);
          console.log('Added to favorites');
        },
        error: (error) => console.error('Error adding favorite', error)
      });
    }
  }

  private clearHideMessageTimer() {
    if (this.hideMessageTimer) {
      clearTimeout(this.hideMessageTimer);
      this.hideMessageTimer = null;
    }
  }

  private startHideMessageTimer(action: () => void) {
    this.clearHideMessageTimer(); // Clear any existing timer
    this.hideMessageTimer = setTimeout(action, 5000); // Set a new timer
  }

  hideMessage() {
    this.showFavoriteMessage = false;
    this.showFavRemoveMessage = false;
    this.clearHideMessageTimer();
  }

  fetchPeerData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<string[]>(`/api/peers?term=${this.tick}`).subscribe({
        next: (data) => {
          this.peerCompanies = data;
          this.checkLoadingComplete();
          console.log('Peer data:', this.peerCompanies);
          resolve();
        },
        error: (error) => {
          console.error('There was an error fetching the peer data!', error)
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }

  checkLoadingComplete() {
    this.loadingOperations--;
    if (this.loadingOperations === 0) {
      // All data has been loaded
      // Hide the spinner and update the UI as necessary
      this.isLoading = false;
    }
  }

  onPeerClick(peer: string, event: MouseEvent): void {
    event.preventDefault(); // Prevent the default anchor action
    this.searchService.triggerSearch(peer);
    this.searchService.searchControl.setValue(peer, { emitEvent: true });
  }

  fetchChartData(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Fetching chart data for ticker:', this.tick); // Debugging log
      if (!this.tick) {
          console.error('Ticker is undefined, cannot fetch chart data.');
          return;
      }
      let fromDate: Date;
      let toDate: Date = new Date(); // Today by default
      this.loadingOperations++;
      console.log('time to debug');
    
      if (this.isMarketOpen) {
        // If the market is open, fetch data from yesterday to today
        fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 1);
      } else {
        console.log('I should be here');
        // If the market is closed, fetch data for the last two days
        fromDate = new Date(this.quoteData.t * 1000); // Assuming this.quoteData.t is the last market close timestamp
        fromDate.setDate(fromDate.getDate() - 1);
      }
    
      const fromDateString = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
    
      const url = `/api/stock/hourly?ticker=${this.tick}&fromDate=${fromDateString}`;
      console.log('chart url is ', url);
      this.isLoading = true;
    
      this.http.get<any[]>(url).subscribe({
        next: (data) => {
          console.log('What is my chart data dude?', data);
          this.chartOptions = this.getChartOptions(data);
          this.checkLoadingComplete();
          this.updateFlag = true; // Required for Highcharts to update the chart
          resolve();
        },
        error: (error) => {
          console.error('Error fetching chart data:', error);
          this.isLoading = false;
          reject(error);
        }
      });
    });
  }

  getChartOptions(data: any[]): Highcharts.Options {
    const transformedData = data.map(item => ({
      x: item.t, // time in milliseconds
      y: item.c // closing price
    }));

    return {
      chart: {
        type: 'line',
        backgroundColor: '#f4f4f4' // greyish background color
      },
      title: {
        text: `${this.profileData?.ticker} Hourly Price Variation`
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: '' // Removed 'values' text
        },
        // additional xAxis options here
      },
      yAxis: {
        // additional yAxis options here
        title: {
          text: '' // Removed 'values' text
        },
        opposite: true 
      },
      series: [{
        type: 'line', // Explicitly setting the type of the series
        name: '',
        showInLegend: false,
        data: transformedData,
        color: this.quoteData && this.quoteData.d < 0 ? '#FF0000' : '#008000', // red or green line based on 'd' value
        marker: {
          enabled: false // Removes the dots on each data point
        }
      }],
      navigator: {
        enabled: true
      },
      rangeSelector: {
        enabled: true
      },
      exporting: {
        enabled: false // Removes the context button
      },
      // additional chart options here
    };
  }


  fetchNewsArticles(): Promise<void>  {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<NewsArticle[]>(`/api/news?ticker=${this.tick}`).subscribe({
        next: (articles) => {
          this.newsArticles = articles;
          console.log('bro i received the news ', this.newsArticles);
          this.checkLoadingComplete();
          resolve();
        },
        error: (error) => {
          console.error('Error fetching news articles:', error);
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }
  
  onTabChange(index: number) {
    this.selectedTabIndex = index;
  }

  openDialog(article: NewsArticle): void {
    const dialogConfig = new MatDialogConfig();
  
    dialogConfig.position = { top: '3%' }; // Position the dialog further up
    dialogConfig.data = { article: article }; // Pass data to the dialog
    
    this.dialog.open(DialogContentComponent, dialogConfig);
  }

  fetchInsiderSentiment(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<Sentiment[]>(`/api/sentiment?ticker=${this.tick}`).subscribe({
        next: (response) => {
          this.sentiments = response;
          console.log('bro i received the sentiments ', this.sentiments);
          this.checkLoadingComplete();
          resolve();
        },
        error: (error) => {
          console.error('Error fetching sentiments:', error);
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }

  getTotalMspr(): number {
    return this.sentiments.reduce((acc, sentiment) => acc + sentiment.mspr, 0);
  }
  
  getTotalChange(): number {
    return this.sentiments.reduce((acc, sentiment) => acc + sentiment.change, 0);
  }
  
  getPositiveMspr(): number {
    return this.sentiments
      .filter(sentiment => sentiment.mspr > 0)
      .reduce((acc, sentiment) => acc + sentiment.mspr, 0);
  }
  
  getPositiveChange(): number {
    return this.sentiments
      .filter(sentiment => sentiment.change > 0)
      .reduce((acc, sentiment) => acc + sentiment.change, 0);
  }
  
  getNegativeMspr(): number {
    return this.sentiments
      .filter(sentiment => sentiment.mspr < 0)
      .reduce((acc, sentiment) => acc + sentiment.mspr, 0);
  }
  
  getNegativeChange(): number {
    return this.sentiments
      .filter(sentiment => sentiment.change < 0)
      .reduce((acc, sentiment) => acc + sentiment.change, 0);
  }

  fetchRecommendationTrends(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<Rec[]>(`/api/rec?ticker=${this.tick}`).subscribe({
        next: (response) => {
          this.recs = response;
          console.log('bro i received the recs ', this.recs);
          this.prepareChartOptions1();
          this.checkLoadingComplete();
          resolve();
        },
        error: (error) => {
          console.error('Error fetching recs:', error);
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }

  prepareChartOptions1() {
    // Map the categories (periods) for the xAxis
    const categories = this.recs.map(rec => rec.period);
    
    // Create the series data array
    const series: Highcharts.SeriesOptionsType[] = [
        {
            type: 'column',
            name: 'Strong Buy',
            data: this.recs.map(rec => rec.strongBuy),
            color: 'darkgreen'
        },
        {
            type: 'column',
            name: 'Buy',
            data: this.recs.map(rec => rec.buy),
            color: 'lightgreen'
        },
        {
            type: 'column',
            name: 'Hold',
            data: this.recs.map(rec => rec.hold),
            color: '#b5651d'
        },
        {
            type: 'column',
            name: 'Sell',
            data: this.recs.map(rec => rec.sell),
            color: 'red'
        },
        {
            type: 'column',
            name: 'Strong Sell',
            data: this.recs.map(rec => rec.strongSell),
            color: '#5C4033'
        }
    ];

    // Configure the chart options
    this.chartOptions1 = {
        chart: {
            type: 'column',
            backgroundColor: '#f4f4f4'
        },
        title: {
            text: 'Recommendation Trends',
            align: 'center'
        },
        xAxis: {
            categories: categories
        },
        yAxis: {
            min: 0,
            title: {
                text: '#Analysis'
            }
        },
        tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
            shared: true
        },
        credits: {
          enabled: false
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: true,
                    format: '{point.y:.0f}'
                }
            }
        },
        exporting: {
          enabled: false // Removes the context button
        },
        series: series
    };

    // Set the update flag to true to update the chart
    this.updateFlag = true;
  }


  fetchEarnings(): Promise<void>  {
    return new Promise((resolve, reject) => {
      this.loadingOperations++;
      this.http.get<Earnings[]>(`/api/earnings?ticker=${this.tick}`).subscribe({
        next: (response) => {
          this.earnings = response;
          console.log('bro i received the earnings ', this.earnings);
          this.prepareChartOptions2();
          this.checkLoadingComplete();
          resolve();
        },
        error: (error) => {
          console.error('Error fetching earnings:', error);
          this.checkLoadingComplete();
          reject(error);
        }
      });
    });
  }


  prepareChartOptions2() {
    const categories = this.earnings.map(earning => earning.period);
    const actual_data = this.earnings.map(earning => ({ 
      surprise: earning.surprise, 
      y: earning.actual, 
    }));
    
    const estimate_data = this.earnings.map(earning => ({
      y: earning.estimate, 
    }));

    const surpriseData = this.earnings.map(earning => earning.surprise);
    this.chartOptions2 = {
      chart: {
          type: 'spline',
          backgroundColor: '#f4f4f4'
      },
      title: {
          text: 'Historical EPS Surprises',
          align: 'center'
      },
      xAxis: {
          categories: categories,
          labels: {
            formatter: function () {
              return `<div style="text-align:center;">${this.value}<br>Surprise: ${surpriseData[this.pos]}</div>`;
            },
            useHTML: true
          },
          lineWidth: 2
      },
      credits: {
        enabled: false
      },
      yAxis: {
          title: {
              text: 'Quarterly EPS'
          }
      },
      plotOptions: {
        spline: {
          marker: {
              enabled: true
          }
        }
      },
      tooltip: {
        shared: true,
        formatter: function () {
          let s = `<b>${this.x}</b>`;
          if (this.points) { // Ensure that 'points' is defined
            this.points.forEach(function (point) {
              if (point.point.surprise !== undefined) {
                s += `<br/>Surprise: <b>${point.point.surprise}</b>`;
              }
              s += `<br/><span style="color:${point.color}">\u25CF</span>: ${point.series.name}: <b>${point.y}</b>`;
            });
          }
          return s;
        }
      },
      exporting: {
        enabled: false // Removes the context button
      },
      series: [{
          name: 'Actual',
          data: actual_data,
          type: 'spline'
      }, {
          name: 'Estimate',
          data: estimate_data,
          type: 'spline'
      }]
    };
    this.updateFlag = true;
  }

  ngOnDestroy() {
    if (this.quoteUpdateInterval) {
      clearInterval(this.quoteUpdateInterval);
    }
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}


