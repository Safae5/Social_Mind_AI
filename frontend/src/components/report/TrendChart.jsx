// frontend/src/components/report/TrendChart.jsx
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
)

export function TrendChart({ trendData }) {
  if (!trendData) return null

  const {
    labels         = [],
    reach_data     = [],
    engagement_data= [],
    trend          = '',
    avg_reach      = 0,
    avg_engagement = 0,
  } = trendData

  const chartData = {
    labels,
    datasets: [
      {
        label           : '👁️ Vues',
        data            : reach_data,
        borderColor     : 'rgba(99, 102, 241, 1)',
        backgroundColor : 'rgba(99, 102, 241, 0.1)',
        fill            : true,
        tension         : 0.4,
        pointRadius     : 5,
        pointHoverRadius: 7,
        borderWidth     : 2,
      },
      {
        label           : '❤️ Interactions',
        data            : engagement_data,
        borderColor     : 'rgba(239, 68, 68, 1)',
        backgroundColor : 'rgba(239, 68, 68, 0.05)',
        fill            : true,
        tension         : 0.4,
        pointRadius     : 5,
        pointHoverRadius: 7,
        borderWidth     : 2,
      },
    ],
  }

  const options = {
    responsive : true,
    interaction: { mode: 'index', intersect: false },
    plugins    : {
      legend : { position: 'top', labels: { usePointStyle: true, padding: 20 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('fr-FR')}`,
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid       : { color: 'rgba(0,0,0,0.05)' },
        ticks      : { callback: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v },
      },
      x: { grid: { display: false } },
    },
  }

  return (
    <div className="space-y-4">
      <Line data={chartData} options={options} height={80} />
      <div className="flex gap-4 justify-center flex-wrap">
        <div className="text-center px-4 py-2 bg-indigo-50 rounded-xl">
          <p className="text-xs text-gray-400">Moy. vues / semaine</p>
          <p className="text-base font-bold text-indigo-700">
            {avg_reach.toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="text-center px-4 py-2 bg-red-50 rounded-xl">
          <p className="text-xs text-gray-400">Moy. interactions / semaine</p>
          <p className="text-base font-bold text-red-700">
            {avg_engagement.toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="text-center px-4 py-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400">Tendance globale</p>
          <p className="text-base font-bold text-gray-700">{trend}</p>
        </div>
      </div>
    </div>
  )
}