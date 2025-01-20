import { useEffect, useRef } from "react";
import {
  Chart,
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import "chartjs-adapter-luxon";

interface CandlestickDataPoint {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface CandlestickChartProps {
  data: CandlestickDataPoint[];
}

// Define the context type
interface CandlestickContext {
  parsed?: {
    x: number;
    o: number;
    h: number;
    l: number;
    c: number;
  };
}

ChartJS.register(
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

export default function CandlestickChart({ data }: CandlestickChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: "candlestick",
      data: {
        datasets: [
          {
            label: "Token Price",
            data: data,
            borderColor: (ctx: any) => {
              const parsed = (ctx as CandlestickContext).parsed;
              return parsed && parsed.c >= parsed.o
                ? "rgb(75, 192, 75)"
                : "rgb(192, 75, 75)";
            },
            borderWidth: 2,
            backgroundColor: (ctx: any) => {
              const parsed = (ctx as CandlestickContext).parsed;
              return parsed && parsed.c >= parsed.o
                ? "rgba(75, 192, 75, 0.5)"
                : "rgba(192, 75, 75, 0.5)";
            },
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: "time",
            time: {
              unit: "minute",
              displayFormats: {
                minute: "HH:mm",
              },
            },
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            position: "right",
            grid: {
              color: "rgba(197, 203, 206, 0.1)",
            },
            ticks: {
              precision: 8,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const ohlc = context.raw as CandlestickDataPoint;
                return [
                  `Open: ${ohlc.o.toFixed(8)}`,
                  `High: ${ohlc.h.toFixed(8)}`,
                  `Low: ${ohlc.l.toFixed(8)}`,
                  `Close: ${ohlc.c.toFixed(8)}`,
                ].filter(Boolean);
              },
            },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data]);

  return (
    <div className="w-full h-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}