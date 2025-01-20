// lib/tradingViewDatafeed.ts
import { PriceDatabase, Bar } from './priceDataBase';

interface Subscription {
  symbolInfo: any;
  resolution: string;
  lastBarTime: number | undefined;
  callback: (bar: Bar) => void;
}

export class TokenDatafeed {
  private priceDb: PriceDatabase;
  private subscriptions: Map<string, Subscription> = new Map();

  constructor() {
    this.priceDb = new PriceDatabase();
  }

  public onReady(callback: any) {
    setTimeout(() => callback({
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
      supports_marks: false,
      supports_time: true,
      supports_timescale_marks: false,
      symbols_types: [{ name: 'crypto', value: 'crypto' }]
    }), 0);
  }

  public resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: any,
    onErrorCallback: any
  ) {
    setTimeout(() => {
      onSymbolResolvedCallback({
        name: symbolName,
        description: 'Token/ETH',
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        minmov: 1,
        pricescale: 1000000000000, // 12 decimals for small values
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: false,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
        volume_precision: 8,
        data_status: 'streaming',
      });
    }, 0);
  }

  public getBars(
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: any,
    onErrorCallback: any
  ) {
    const { from, to, countBack } = periodParams;

    setTimeout(() => {
      const bars = this.priceDb.getBars(resolution, from, to);
      
      if (bars.length === 0) {
        onHistoryCallback([], { noData: true });
      } else {
        onHistoryCallback(bars);
      }
    }, 0);
  }
  
  public searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: (items: any[]) => void): void {

    onResult([{

      symbol: 'TOKEN/ETH',

      full_name: 'TOKEN/ETH',

      description: 'Token to ETH pair',

      exchange: 'DEX',

      type: 'crypto'

    }]);

  }

  public subscribeBars(
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: any,
    subscriberUID: string
  ) {
    const lastBar = this.priceDb.getLastBar(resolution);
    this.subscriptions.set(subscriberUID, {
      symbolInfo,
      resolution,
      lastBarTime: lastBar?.time,
      callback: onRealtimeCallback,
    });
  }

  public unsubscribeBars(subscriberUID: string) {
    this.subscriptions.delete(subscriberUID);
  }

  // Method to update price from your contract
  public updatePrice(ethReserve: bigint, tokenReserve: bigint) {
    this.priceDb.updatePrice(ethReserve, tokenReserve);
    
    // Notify all subscribers
    this.subscriptions.forEach((sub) => {
      const lastBar = this.priceDb.getLastBar(sub.resolution);
      if (lastBar && lastBar.time !== sub.lastBarTime) {
        sub.callback(lastBar);
        sub.lastBarTime = lastBar.time;
      }
    });
  }
}