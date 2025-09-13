import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { logger } from './logger.js';

export class ChartGenerator {
  constructor() {
    this.width = 800;
    this.height = 400;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: this.width, 
      height: this.height,
      backgroundColour: '#1a1a1a'
    });
  }

  async generatePriceChart(priceHistory, currentPrice, trend) {
    try {
      // Prepare data
      const labels = priceHistory.map((point, index) => {
        const time = new Date(point.timestamp);
        return time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      });
      
      const prices = priceHistory.map(point => point.price);
      if (currentPrice) {
        labels.push('Now');
        prices.push(currentPrice);
      }

      // Determine colors based on trend
      const trendColor = trend === 'uptrend' ? '#22c55e' : trend === 'downtrend' ? '#ef4444' : '#6b7280';
      const backgroundColor = trend === 'uptrend' ? 'rgba(34, 197, 94, 0.1)' : trend === 'downtrend' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)';

      const configuration = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Nyla Price',
            data: prices,
            borderColor: trendColor,
            backgroundColor: backgroundColor,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: trendColor,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Nyla Coin Price Chart ${trend === 'uptrend' ? '🐂' : trend === 'downtrend' ? '🐻' : '🦀'}`,
              color: '#ffffff',
              font: {
                size: 20,
                weight: 'bold'
              }
            },
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: trendColor,
              borderWidth: 1,
              displayColors: false,
              callbacks: {
                label: (context) => {
                  return `$${context.parsed.y.toFixed(6)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              },
              ticks: {
                color: '#9ca3af',
                maxRotation: 45,
                minRotation: 45
              },
              title: {
                display: true,
                text: 'Time',
                color: '#ffffff'
              }
            },
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              },
              ticks: {
                color: '#9ca3af',
                callback: function(value) {
                  if (value < 0.00001) return value.toExponential(2);
                  if (value < 0.01) return value.toFixed(6);
                  return value.toFixed(4);
                }
              },
              title: {
                display: true,
                text: 'Price (USD)',
                color: '#ffffff'
              }
            }
          },
          layout: {
            padding: 20
          }
        }
      };

      // Add annotations for min/max
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const lastPrice = prices[prices.length - 1];

      // Generate buffer
      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      return imageBuffer;

    } catch (error) {
      logger.error('Error generating chart:', error);
      return null;
    }
  }

  async generateTransactionImpactChart(transactionAmount, liquidity, transactionType) {
    try {
      const impactPercent = (transactionAmount / liquidity) * 100;
      
      const configuration = {
        type: 'doughnut',
        data: {
          labels: ['Transaction', 'Remaining Liquidity'],
          datasets: [{
            data: [transactionAmount, liquidity - transactionAmount],
            backgroundColor: [
              transactionType === 'BUY' ? '#22c55e' : '#ef4444',
              '#374151'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Market Impact: ${impactPercent.toFixed(2)}%`,
              color: '#ffffff',
              font: {
                size: 18,
                weight: 'bold'
              }
            },
            legend: {
              position: 'bottom',
              labels: {
                color: '#ffffff'
              }
            }
          }
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      return imageBuffer;

    } catch (error) {
      logger.error('Error generating impact chart:', error);
      return null;
    }
  }
}