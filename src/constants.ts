import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Inter',
        },
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#94a3b8',
      },
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
      },
      ticks: {
        color: '#94a3b8',
        callback: (value: any) => `$${value}`,
      },
    },
  },
};
