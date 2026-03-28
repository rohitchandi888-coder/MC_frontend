import React, { useState, useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time, 
  ColorType,
  LineStyle,
  LineType,
  PriceScaleMode,
  CrosshairMode,
  CandlestickSeries,
} from 'lightweight-charts';
import { getApiUrl } from '../../config';


const currencyRatesToUSD: Record<string, number> = {
  USD: 1,
  INR: 1 / 94.54,
  EUR: 1.08,
};

const USD_TO_INR = 94.54;
interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  selectedCoins: string[];
  auth?: { token: string } | null;
}

export const TradingChart: React.FC<TradingChartProps> = ({ selectedCoins, auth }) => {
  const [selectedCoin, setSelectedCoin] = useState<string>('FDA');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'>('1h');
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change24h: number; volume24h: number }>>({});
  const [ohlcData, setOhlcData] = useState<Record<string, OHLCData[]>>({});
  const [coinSearch, setCoinSearch] = useState<string>('');
  const [filteredCoins, setFilteredCoins] = useState<string[]>(['BTC', 'ETH', 'FDA', 'JIO']);
  
  // Available coins for search
  const availableCoins = ['BTC', 'ETH', 'FDA', 'JIO'];
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Coin names mapping - defined early for use in search
  const coinNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    FDA: 'FDA Token',
    JIO: 'Jio Marchand Coin',
  };

  // Fetch live prices from CoinGecko API
  const fetchLivePrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true'
      );
      if (!response.ok) {
        console.warn('Failed to fetch live prices from CoinGecko');
        return;
      }
      const data = await response.json();
      
      setLivePrices({
        BTC: {
          price: data.bitcoin?.usd || 82969.41,
          change24h: data.bitcoin?.usd_24h_change || 0,
          volume24h: data.bitcoin?.usd_24h_vol || 0,
        },
        ETH: {
          price: data.ethereum?.usd || 3500,
          change24h: data.ethereum?.usd_24h_change || 0,
          volume24h: data.ethereum?.usd_24h_vol || 0,
        },
      });
      console.log('✅ Fetched live prices:', {
        BTC: data.bitcoin?.usd,
        ETH: data.ethereum?.usd,
      });
    } catch (error) {
      console.error('Error fetching live prices:', error);
      // Set fallback prices
      setLivePrices({
        BTC: { price: 82969.41, change24h: 0, volume24h: 0 },
        ETH: { price: 3500, change24h: 0, volume24h: 0 },
      });
    }
  };

  // Fetch live prices on component mount and refresh every 1 second
  useEffect(() => {
    fetchLivePrices();
    // Refresh prices every 1 second for live updates
    // const priceInterval = setInterval(fetchLivePrices, 1000);
    // return () => clearInterval(priceInterval);
  }, []);

  // Generate realistic OHLC data with volume
  const generateOHLCData = (coin: string, tf: string): OHLCData[] => {
    const data: OHLCData[] = [];
    let intervals = 100;
    let intervalMs = 60000; // 1 minute default

    switch (tf) {
      case '1m':
        intervals = 100;
        intervalMs = 60000;
        break;
      case '5m':
        intervals = 100;
        intervalMs = 300000;
        break;
      case '15m':
        intervals = 100;
        intervalMs = 900000;
        break;
      case '1h':
        intervals = 100;
        intervalMs = 3600000;
        break;
      case '4h':
        intervals = 100;
        intervalMs = 14400000;
        break;
      case '1d':
        intervals = 100;
        intervalMs = 86400000;
        break;
      case '1w':
        intervals = 52;
        intervalMs = 604800000;
        break;
    }

    const basePrices: Record<string, number> = {
      BTC: livePrices.BTC?.price || 82969.41, // Current Bitcoin price fallback
      ETH: livePrices.ETH?.price || 3500, // Current Ethereum price fallback
      FDA: 3600, // FDA token starts at 2800 INR
      JIO: 0.02,
    };

    const basePrice = basePrices[coin] || 1;
    const now = new Date();
    let currentPrice = basePrice;

    // Use a deterministic seed based on coin and timeframe for consistent prices
    const seed = `${coin}-${tf}`;
    let seedValue = 0;
    for (let i = 0; i < seed.length; i++) {
      seedValue = ((seedValue << 5) - seedValue) + seed.charCodeAt(i);
      seedValue = seedValue & seedValue; // Convert to 32bit integer
    }
    
    // Simple seeded random function for deterministic results
    let seedRandom = Math.abs(seedValue);
    const seededRandom = () => {
      seedRandom = (seedRandom * 9301 + 49297) % 233280;
      return seedRandom / 233280;
    };

    for (let i = intervals; i >= 0; i--) {
      const time = new Date(now.getTime() - i * intervalMs);
      
      // Generate realistic price movement with seeded random for consistency
      const trend = (seededRandom() - 0.48) * 0.02; // Slight upward bias
      const volatility = basePrice * 0.015;
      const randomWalk = (seededRandom() - 0.5) * volatility;
      
      const open = currentPrice;
      const change = trend + randomWalk;
      const high = open + Math.abs(change) + seededRandom() * volatility * 0.5;
      const low = open - Math.abs(change) - seededRandom() * volatility * 0.5;
      const close = open + change;
      currentPrice = close;

      // Generate volume (higher volume on bigger moves) - use seeded random
      const priceChange = Math.abs(close - open) / open;
      const baseVolume = 1000000;
      const volume = baseVolume * (1 + priceChange * 10) * (0.5 + seededRandom());

      data.push({
        time: time.toISOString().slice(0, 19).replace('T', ' '),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Number(volume.toFixed(0)),
      });
    }

    // For FDA, ensure the last price ends exactly at base price (2800) for consistency
    if (coin === 'FDA' && data.length > 0) {
      const lastPrice = data[data.length - 1].close;
      const adjustment = basePrice - lastPrice;
      // Adjust all prices proportionally so the last one is exactly at base price
      data.forEach((point, index) => {
        const ratio = index / (data.length - 1);
        point.open = Number((point.open + (adjustment * ratio)).toFixed(2));
        point.high = Number((point.high + (adjustment * ratio)).toFixed(2));
        point.low = Number((point.low + (adjustment * ratio)).toFixed(2));
        point.close = Number((point.close + (adjustment * ratio)).toFixed(2));
      });
      // Force the very last price to be exactly 2800
      const lastPoint = data[data.length - 1];
      const lastOpenBefore = lastPoint.open;
      lastPoint.close = basePrice;
      // Adjust open to be realistic (close to close price)
      if (Math.abs(lastOpenBefore - basePrice) > 10) {
        lastPoint.open = Number((basePrice - (lastOpenBefore - basePrice) * 0.1).toFixed(2));
      } else {
        lastPoint.open = Number((basePrice + (lastOpenBefore - basePrice)).toFixed(2));
      }
      // Ensure high and low include 2800
      lastPoint.high = Math.max(lastPoint.high, basePrice);
      lastPoint.low = Math.min(lastPoint.low, basePrice);
    }

    return data;
  };

  // Initialize TradingView-like chart
  useEffect(() => {
    const initChart = () => {
      if (!chartContainerRef.current) {
        console.log('Chart container not ready, retrying...');
        return false;
      }

      // Clean up existing chart if any
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          console.error('Error removing existing chart:', error);
        }
        chartRef.current = null;
        setChartReady(false);
      }

      const container = chartContainerRef.current;
      if (!container) {
        console.log('Container is null');
        return false;
      }

      // Ensure container has dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.log('Container has no dimensions, retrying...', {
          width: container.clientWidth,
          height: container.clientHeight
        });
        return false;
      }

      try {
        console.log('Creating chart with dimensions:', {
          width: container.clientWidth,
          height: container.clientHeight
        });
        
        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: '#131722' },
            textColor: '#d1d4dc',
            fontSize: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          grid: {
            vertLines: { 
              color: '#1e222d',
              style: LineStyle.Solid,
              visible: true,
            },
            horzLines: { 
              color: '#1e222d',
              style: LineStyle.Solid,
              visible: true,
            },
          },
          width: container.clientWidth,
          height: 600,
          autoSize: false,
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: '#758696',
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: '#131722',
            },
            horzLine: {
              color: '#758696',
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: '#131722',
            },
          },
          rightPriceScale: {
            borderColor: '#2B2B43',
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          },
          timeScale: {
            borderColor: '#2B2B43',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 3,
            rightBarStaysOnScroll: true,
            lockVisibleTimeRangeOnResize: true,
          },
          watermark: {
            visible: false,
          },
        });

        chartRef.current = chart;
        const chartProto = Object.getPrototypeOf(chart);
        const allMethods = Object.getOwnPropertyNames(chartProto);
        const addMethods = allMethods.filter(m => m.includes('add') || m.includes('Series') || m.includes('Candle'));
        console.log('Chart created successfully', {
          hasAddCandlestickSeries: typeof chart.addCandlestickSeries === 'function',
          chartType: typeof chart,
          allMethods: allMethods,
          addMethods: addMethods,
          chartKeys: Object.keys(chart).slice(0, 20)
        });
        
        // Set chart ready immediately
        setChartReady(true);

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            const width = chartContainerRef.current.clientWidth;
            const height = chartContainerRef.current.clientHeight;
            chartRef.current.applyOptions({
              width: width,
              height: height || 600,
            });
            console.log('📏 Chart resized to:', width, 'x', height || 600);
          }
        };

        // Initial resize after a short delay to ensure container is ready
        setTimeout(() => {
          handleResize();
        }, 200);

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          setChartReady(false);
          try {
            chart.remove();
          } catch (error) {
            console.error('Error removing chart:', error);
          }
        };
      } catch (error) {
        console.error('Error creating chart:', error);
        setChartReady(false);
        return false;
      }
      return true;
    };

    // Try to initialize immediately
    if (!initChart()) {
      // If failed, retry after a short delay
      const timer = setTimeout(() => {
        if (!chartRef.current) {
          initChart();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

// Update chart data
useEffect(() => {

  if (!chartRef.current || !chartContainerRef.current) {
    console.log('Chart not ready');
    return;
  }

  const chart = chartRef.current;

  const data = ohlcData[selectedCoin] || [];

  if (data.length === 0) {

    console.log('No data for', selectedCoin);

    try {

      if (candlestickSeriesRef.current) {
        chart.removeSeries(candlestickSeriesRef.current);
        candlestickSeriesRef.current = null;
      }

      if (volumeSeriesRef.current) {
        chart.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }

    } catch (error) {
      console.error('Series cleanup error', error);
    }

    return;
  }

  console.log("Updating chart with", data.length, "points");

  // remove old series
  try {

    if (candlestickSeriesRef.current) {
      chart.removeSeries(candlestickSeriesRef.current);
      candlestickSeriesRef.current = null;
    }

    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

  } catch (error) {
    console.error("removeSeries error", error);
  }

  // sort data by time
  const sortedData = [...data].sort((a, b) =>
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // format candles
  const formattedData = sortedData.map(item => {

    const date = new Date(item.time);

    return {
      time: Math.floor(date.getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    };

  });

  // volume data
  const volumeData = sortedData.map(item => {

    const date = new Date(item.time);

    return {

      time: Math.floor(date.getTime() / 1000),

      value: item.volume || 0,

      color:
        item.close >= item.open
          ? 'rgba(0, 212, 170, 0.5)'
          : 'rgba(255, 73, 118, 0.5)',

    };

  });

  try {

    // add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {

      upColor: '#00d4aa',
      downColor: '#ff4976',

      borderVisible: false,

      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4976',

      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },

    });

    candleSeries.setData(formattedData);

    candlestickSeriesRef.current = candleSeries;

    console.log("Candles added", formattedData.length);


    // add volume bars
   const volumeSeries = chart.addHistogramSeries({

      color: '#26a69a',

      priceFormat: {
        type: 'volume',
      },

      priceScaleId: '',

      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },

    });

    volumeSeries.setData(volumeData);

    volumeSeriesRef.current = volumeSeries;

    console.log("Volume bars added", volumeData.length);


    // auto fit chart
    chart.timeScale().fitContent();


  } catch (error) {

    // console.error("Chart rendering error", error);

  }

}, [selectedCoin, ohlcData]);

  // Fetch P2P trades data for FDA and convert to OHLC
  const fetchP2PTradesData = async (): Promise<OHLCData[]> => {
    if (!auth?.token) {
      console.warn('No auth token, using mock data');
      return generateOHLCData('FDA', timeframe);
    }

    try {
      const res = await fetch(getApiUrl('trades'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        console.warn('Failed to fetch trades');
        return generateOHLCData('FDA', timeframe);
      }

      const trades = await res.json();
      
      // Filter only FDA trades and completed trades
      const fdaTrades = trades.filter((t: any) => 
        t.asset_symbol === 'FDA' &&
        ['COMPLETED', 'PAID_PENDING_RELEASE', 'PENDING_PAYMENT'].includes(t.status)
      );

     if (fdaTrades.length === 0) {
      console.warn('No trades found → using mock data');
      return generateOHLCData('FDA', timeframe);
    }

      // Group trades by timeframe intervals
      const intervalMs = {
        '1m': 60000,
        '5m': 300000,
        '15m': 900000,
        '1h': 3600000,
        '4h': 14400000,
        '1d': 86400000,
        '1w': 604800000,
      }[timeframe] || 3600000;

      // Sort trades by created_at
      fdaTrades.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Group into intervals and calculate OHLC
      const grouped: Record<string, { prices: number[]; volumes: number[] }> = {};
      
      fdaTrades.forEach((trade: any) => {
        const tradeTime = new Date(trade.created_at).getTime();
        const intervalStart = Math.floor(tradeTime / intervalMs) * intervalMs;
        const key = new Date(intervalStart).toISOString();
        
        if (!grouped[key]) {
          grouped[key] = { prices: [], volumes: [] };
        }
        
        // const price = parseFloat(trade.price) || 0;
        // convert trade price → USD
        let priceUSD =
          parseFloat(trade.price) *
          (currencyRatesToUSD[trade.fiat_currency] || 1);

        // convert USD → INR
        let priceINR = priceUSD * USD_TO_INR;

        // FDA price floor
        priceINR = Math.max(priceINR, 3600);
        const amount = parseFloat(trade.amount) || 0;
        
        if (priceINR > 0) {
          grouped[key].prices.push(priceINR);
          // grouped[key].prices.push(price);
          grouped[key].volumes.push(amount);
        }
      });

      // Convert grouped data to OHLC and sort by time (ascending)
      const ohlc: OHLCData[] = Object.keys(grouped)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) // Sort by time ascending
        .map(key => {
          const { prices, volumes } = grouped[key];
          if (prices.length === 0) return null;
          
          const open = prices[0];
          const close = prices[prices.length - 1];
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const volume = volumes.reduce((a, b) => a + b, 0);

          return {
            time: key.slice(0, 19).replace('T', ' '),
            
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),


            volume: Number(volume.toFixed(2)),
          };
        })
        .filter((item): item is OHLCData => item !== null);

      // Ensure data is sorted by time (ascending) - double check
      ohlc.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      // If we have less than 50 data points, fill with mock data
      if (ohlc.length < 50) {
        const mockData = generateOHLCData('FDA', timeframe);
        // Ensure the last price in mock data is exactly 2800
        if (mockData.length > 0) {
          const lastPoint = mockData[mockData.length - 1];
          lastPoint.close = 3600;
          lastPoint.high = Math.max(lastPoint.high, 3600);
          lastPoint.low = Math.min(lastPoint.low, 3600);
        }
        // Ensure mock data is also sorted
        const combined = [...ohlc, ...mockData.slice(ohlc.length)].slice(0, 100);
        combined.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        // Ensure the very last point closes at 3600
        if (combined.length > 0) {
          const lastCombined = combined[combined.length - 1];
          lastCombined.close = 3600;
        }
        return combined;
      }
      
      // Ensure the last price in real trade data is also normalized if it's close to 3600
      if (ohlc.length > 0) {
        const lastPoint = ohlc[ohlc.length - 1];
        // If the last price is very close to 3600 (within 50), normalize it to 3600 for consistency
        if (Math.abs(lastPoint.close - 3600) < 50) {
          lastPoint.close = 3600;
        }
      }

      return ohlc.slice(-100); // Last 100 intervals (already sorted)
    } catch (error) {
      console.error('Error fetching P2P trades:', error);
      return generateOHLCData('FDA', timeframe);
    }
  };

  // Fetch data when coin or timeframe changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (selectedCoin === 'FDA') {
        // Fetch P2P trades data for FDA
        const data = await fetchP2PTradesData();
        console.log(`✅ Loaded ${data.length} P2P trade data points for FDA (${timeframe})`);
        setOhlcData(prev => ({ ...prev, [selectedCoin]: data }));
      } else {
        // Generate mock data for other coins
        const data = generateOHLCData(selectedCoin, timeframe);
        console.log(`✅ Generated ${data.length} data points for ${selectedCoin} (${timeframe})`);
        setOhlcData(prev => ({ ...prev, [selectedCoin]: data }));
      }
      setLoading(false);
    };
    loadData();
  }, [selectedCoin, timeframe, auth]);

  // Handle search submit
  const handleSearchSubmit = () => {
    if (!coinSearch.trim()) {
      // If search is empty, select FDA
      setSelectedCoin('FDA');
      setCoinSearch('');
      return;
    }

    const searchLower = coinSearch.toLowerCase().trim();
    const filtered = availableCoins.filter(coin => {
      const coinName = coinNames[coin]?.toLowerCase() || '';
      const coinSymbol = coin.toLowerCase();
      // Search in coin name, symbol, or variations
      const searchTerm = searchLower.replace(/\s+/g, '').replace(/coin|token/gi, '');
      const coinNameClean = coinName.replace(/\s+/g, '').replace(/coin|token/gi, '');
      return coinName.includes(searchLower) || 
             coinSymbol.includes(searchLower) ||
             coinNameClean.includes(searchTerm) ||
             coinSymbol.includes(searchTerm);
    });

    if (filtered.length > 0) {
      setSelectedCoin(filtered[0]);
      setCoinSearch('');
      console.log('✅ Search submitted, selected:', filtered[0]);
    } else {
      // No results - default to FDA
      console.log('⚠️ No results found for:', coinSearch, '- defaulting to FDA');
      setSelectedCoin('FDA');
      setCoinSearch('');
    }
  };

  // Filter coins based on search (for display purposes)
  useEffect(() => {
    if (!coinSearch.trim()) {
      setFilteredCoins(availableCoins);
    } else {
      const searchLower = coinSearch.toLowerCase().trim();
      const filtered = availableCoins.filter(coin => {
        const coinName = coinNames[coin]?.toLowerCase() || '';
        const coinSymbol = coin.toLowerCase();
        const searchTerm = searchLower.replace(/\s+/g, '').replace(/coin|token/gi, '');
        const coinNameClean = coinName.replace(/\s+/g, '').replace(/coin|token/gi, '');
        return coinName.includes(searchLower) || 
               coinSymbol.includes(searchLower) ||
               coinNameClean.includes(searchTerm) ||
               coinSymbol.includes(searchTerm);
      });
      setFilteredCoins(filtered);
    }
  }, [coinSearch]);

  // CoinGecko API calls removed - only using FDA P2P trade data

  const formatPrice = (value: number, coin: string) => {
    if (coin === 'BTC' || coin === 'ETH') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // if (coin === 'FDA') {
    //   return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    // }
    if (coin === 'FDA') {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
    return `$${value.toFixed(6)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const coinColors: Record<string, string> = {
    BTC: '#f7931a',
    ETH: '#627eea',
    FDA: '#00d4ff',
    JIO: '#ff6b6b',
  };

  // Get current price - use live price for BTC/ETH, otherwise use chart data
  const getCurrentPrice = () => {
    if (selectedCoin === 'BTC' && livePrices.BTC?.price) {
      return livePrices.BTC.price;
    }
    if (selectedCoin === 'ETH' && livePrices.ETH?.price) {
      return livePrices.ETH.price;
    }
    if (selectedCoin === 'FDA') {
      // For FDA, always show base price (2800) for consistency
      // This ensures the price display is always ₹2,800.00 regardless of timeframe
      // Only use actual trade price if we have real P2P trades with significantly different prices
      const lastClose = ohlcData[selectedCoin]?.[ohlcData[selectedCoin].length - 1]?.close;
      // If price is significantly different from 2800 (more than 200 INR difference), it's likely real trade data
      if (lastClose && lastClose > 0 && Math.abs(lastClose - 3600) > 200) {
        // This is likely real trade data, use it
        return lastClose;
      }
      // Always default to base price (2800) for mock data consistency
      return 3600;
    }
    return ohlcData[selectedCoin]?.[ohlcData[selectedCoin].length - 1]?.close || 0;
  };

  const currentPrice = getCurrentPrice();
  
  // Get volume - use live volume for BTC/ETH, otherwise use chart data
  const getVolume24h = () => {
    if (selectedCoin === 'BTC' && livePrices.BTC?.volume24h) {
      return livePrices.BTC.volume24h;
    }
    if (selectedCoin === 'ETH' && livePrices.ETH?.volume24h) {
      return livePrices.ETH.volume24h;
    }
    return ohlcData[selectedCoin]?.reduce((sum, item) => sum + (item.volume || 0), 0) || 0;
  };

  const volume24h = getVolume24h();

    return (
    <div className="tradingview-chart-container" style={{ background: '#0f172a' }}>
      {/* TradingView-like Header */}
      <div className="bg-slate-800 border-b border-slate-600 p-4" style={{ background: '#1e293b' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Coin Search */}
          <div className="flex-1 min-w-[250px] flex gap-2">
            <input
              type="text"
              placeholder="🔍 Search coin (Bitcoin, Ethereum, FDA, JIO)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              value={coinSearch}
              onChange={(e) => setCoinSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent placeholder-slate-400"
            />
            <button
              onClick={handleSearchSubmit}
              className="px-6 py-2.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-600 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Search
            </button>
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-slate-300 text-sm font-semibold whitespace-nowrap">Timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
              className="px-4 py-2.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent cursor-pointer"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Price Info Bar */}
      <div className="bg-slate-800 border-b border-slate-600 p-4" style={{ background: '#1e293b' }}>
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-1 font-semibold">{coinNames[selectedCoin]}</p>
              <p className="text-3xl font-bold " style={{ color: "#ce1010" }}>
                {formatPrice(currentPrice, selectedCoin)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container - Always render container, show overlays */}
      <div className="border-b border-slate-600" style={{ position: 'relative', minHeight: '600px', background: '#131722', width: '100%' }}>
        {/* Chart container - always rendered and visible */}
        <div 
          ref={chartContainerRef} 
          id="chart-container"
          style={{ 
            width: '100%', 
            height: '600px',
            minHeight: '600px',
            position: 'relative',
            background: '#131722',
            zIndex: 1,
            display: 'block',
            visibility: 'visible',
          }} 
        />
        {/* Loading overlay */}
        {loading && ohlcData[selectedCoin]?.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10" style={{ pointerEvents: 'none' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-slate-300 font-semibold">Loading chart data...</p>
              <p className="text-slate-400 text-sm mt-2">Fetching P2P trade data...</p>
            </div>
          </div>
        )}
        {/* Empty state overlay */}
        {!loading && ohlcData[selectedCoin]?.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10" style={{ pointerEvents: 'none' }}>
            <div className="text-center">
              <p className="text-slate-300 font-semibold text-lg mb-2">No chart data available</p>
              <p className="text-slate-400 text-sm">No completed FDA trades found for the selected timeframe.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
