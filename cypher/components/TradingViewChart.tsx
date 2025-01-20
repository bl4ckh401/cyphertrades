"use client";

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface TradingViewChartProps {
  datafeed: any;
  containerId: string;
  height?: number;
}

let tvScriptLoadingPromise: Promise<void> | null = null;

export default function TradingViewChart({ datafeed, containerId, height = 400 }: TradingViewChartProps) {
  const onLoadScriptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onLoadScriptRef.current = createWidget;

    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = '/charting_library/charting_library.standalone.js';
        script.type = 'text/javascript';
        script.onload = resolve as any;
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(() => onLoadScriptRef.current && onLoadScriptRef.current());

    return () => {
      onLoadScriptRef.current = null;
    };

    function createWidget() {
      if (document.getElementById(containerId) && 'TradingView' in window) {
        new window.TradingView.widget({
          symbol: 'TOKEN/ETH',
          interval: '1',
          datafeed: datafeed,
          container_id: containerId,
          library_path: '/charting_library/',
          locale: 'en',
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: ['study_templates'],
          timezone: 'Etc/UTC',
          theme: 'Dark',
          toolbar_bg: '#f1f3f6',
          fullscreen: false,
          autosize: true,
          studies_overrides: {},
          overrides: {
            "mainSeriesProperties.showCountdown": true,
            "paneProperties.background": "#131722",
            "paneProperties.vertGridProperties.color": "#363c4e",
            "paneProperties.horzGridProperties.color": "#363c4e",
            "symbolWatermarkProperties.transparency": 90,
            "scalesProperties.textColor": "#AAA"
          }
        });
      }
    }
  }, [datafeed, containerId]);

  return (
    <div 
      id={containerId} 
      className="relative w-full"
      style={{ height: `${height}px` }}
    />
  );
}