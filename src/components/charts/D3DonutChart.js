import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { getArchetypeInfo } from '../../services/aestheticScoringService';

const D3DonutChart = ({
  data = [],
  size = 200,
  strokeWidth = 30,
  onSegmentPress = null
}) => {
  const webViewRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [d3AssetUri, setD3AssetUri] = useState(null);

  // Load D3 asset on mount
  useEffect(() => {
    const loadD3Asset = async () => {
      try {
        const asset = Asset.fromModule(require('../../../assets/js/d3.v7.min.js'));
        await asset.downloadAsync();
        setD3AssetUri(asset.localUri || asset.uri);
      } catch (error) {
        console.warn('Failed to load D3 asset, falling back to CDN:', error);
        setD3AssetUri('https://d3js.org/d3.v7.min.js');
      }
    };
    loadD3Asset();
  }, []);

  // Post data to WebView when data changes
  useEffect(() => {
    if (!webViewRef.current) return; // nothing to send to yet
    if (data.length === 0) return;   // no data yet
  
    // build chart data
    const chartData = data.map(item => ({
      name: item.name || item.archetype,
      archetype: item.archetype,
      value: item.percentage || 0,
      score: item.score || 0,
      color: item.color || '#999999',
      isPrimary: item.isPrimary || false,
      isSecondary: item.isSecondary || false
    }));
  
    console.log('Sending chart data to WebView immediately:', chartData);
  
    webViewRef.current.postMessage(JSON.stringify({
      type: 'updateChart',
      data: chartData,
      size,
      strokeWidth
    }));
  }, [data, size, strokeWidth]); // 👈 removed webViewLoaded

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', message);
      
      if (message.type === 'chartReady') {
        console.log('Chart is ready, sending data again');
        // Send data again when chart signals it's ready
        const sendDataToWebView = () => {
          if (webViewRef.current && data.length > 0) {
            const chartData = data.map(item => ({
              name: item.name || item.archetype,
              archetype: item.archetype,
              value: item.percentage || 0,
              score: item.score || 0,
              color: item.color || '#999999',
              isPrimary: item.isPrimary || false,
              isSecondary: item.isSecondary || false
            }));
      
            console.log('Sending chart data after ready signal:', chartData);
            const message = JSON.stringify({
              type: 'updateChart',
              data: chartData,
              size: size,
              strokeWidth: strokeWidth
            });
            
            webViewRef.current.postMessage(message);
          }
        };
        sendDataToWebView();
      }
       else if (message.type === 'segmentClick') {
        const archetypeInfo = getArchetypeInfo(message.data.archetype);
        setSelectedArchetype({
          ...message.data,
          description: archetypeInfo?.description || '',
          vibe: archetypeInfo?.vibe || []
        });
        setModalVisible(true);
      } else if (message.type === 'segmentDoubleClick') {
        if (onSegmentPress) {
          onSegmentPress(message.data);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArchetype(null);
  };

  const navigateToDetail = () => {
    closeModal();
    if (onSegmentPress) {
      onSegmentPress(selectedArchetype);
    }
  };

  const htmlContent = useMemo(() => {
    // Don't generate HTML until D3 asset is loaded
    if (!d3AssetUri) return '';
    
    const chartData = data.map(item => ({
      name: item.name || item.archetype,
      archetype: item.archetype,
      value: item.percentage || 0,
      score: item.score || 0,
      color: item.color || '#999999',
      isPrimary: item.isPrimary || false,
      isSecondary: item.isSecondary || false
    }));

    console.log('Creating HTML with chart data:', chartData);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="${d3AssetUri}"></script>
        <style>
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: transparent;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            body {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            #chart {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .arc-path {
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .arc-path:hover {
                filter: brightness(1.1);
            }
            #debug {
                position: absolute;
                top: 5px;
                left: 5px;
                font-size: 10px;
                color: red;
                background: rgba(255,255,255,0.9);
                padding: 2px 5px;
                border-radius: 3px;
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id="debug">Loading...</div>
        <div id="chart"></div>
        
        <script>
            const chartData = ${JSON.stringify(chartData)};
            const chartSize = ${size};
            const strokeWidth = ${strokeWidth};
            
            console.log('Script loaded:', chartData.length, 'items');
            document.getElementById('debug').textContent = 'Script loaded: ' + chartData.length + ' items';
            
            let clickTimeout = null;
            
            function waitForD3AndRender() {
                if (typeof d3 === 'undefined') {
                    console.log('D3 not loaded yet, waiting...');
                    document.getElementById('debug').textContent = 'Waiting for D3...';
                    setTimeout(waitForD3AndRender, 100);
                    return;
                }
                
                console.log('D3 loaded, creating chart');
                document.getElementById('debug').textContent = 'D3 loaded, creating chart...';
                createChart();
            }
            
            function createChart() {
                if (!chartData || chartData.length === 0) {
                    console.log('No chart data');
                    document.getElementById('debug').textContent = 'No data to render';
                    return;
                }
                
                const container = d3.select('#chart');
                
                // Clear any existing content
                container.selectAll('*').remove();
                
                const radius = chartSize / 2;
                const innerRadius = radius - strokeWidth;
                const outerRadius = radius - 15;
                
                // Calculate total for percentages
                const total = d3.sum(chartData, d => d.value);
                if (total === 0) {
                    console.log('Total value is 0');
                    document.getElementById('debug').textContent = 'Total value is 0';
                    return;
                }
                
                console.log('Creating SVG with total:', total);
                document.getElementById('debug').textContent = 'Rendering chart...';
                
                // Create SVG
                const svg = container
                    .append('svg')
                    .attr('width', chartSize)
                    .attr('height', chartSize);
                
                const g = svg
                    .append('g')
                    .attr('transform', \`translate(\${chartSize/2}, \${chartSize/2})\`);
                
                // Create pie layout
                const pie = d3.pie()
                    .value(d => d.value)
                    .sort(null)
                    .padAngle(0.02);
                
                // Create arc generator
                const arc = d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius)
                    .cornerRadius(3);
                
                // Generate pie data
                const pieData = pie(chartData);
                
                // Create arcs
                const arcs = g.selectAll('.arc')
                    .data(pieData)
                    .enter()
                    .append('g')
                    .attr('class', 'arc');
                
                // Add paths
                arcs.append('path')
                    .attr('class', 'arc-path')
                    .attr('d', arc)
                    .attr('fill', d => d.data.color)
                    .attr('stroke', d => {
                        if (d.data.isPrimary) return '#000000';
                        if (d.data.isSecondary) return '#333333';
                        return '#ffffff';
                    })
                    .attr('stroke-width', d => {
                        if (d.data.isPrimary) return 3;
                        if (d.data.isSecondary) return 2;
                        return 1;
                    })
                    .style('opacity', 0)
                    .transition()
                    .duration(500)
                    .style('opacity', 1);
                
                // Add click handlers
                arcs.select('path')
                    .on('click', function(event, d) {
                        event.preventDefault();
                        event.stopPropagation();
                        
                        if (clickTimeout) {
                            // Double click
                            clearTimeout(clickTimeout);
                            clickTimeout = null;
                            
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'segmentDoubleClick',
                                    data: d.data
                                }));
                            }
                        } else {
                            // Single click
                            clickTimeout = setTimeout(() => {
                                clickTimeout = null;
                                
                                if (window.ReactNativeWebView) {
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'segmentClick',
                                        data: d.data
                                    }));
                                }
                            }, 250);
                        }
                    });
                
                console.log('Chart created successfully');
                document.getElementById('debug').textContent = 'Chart rendered ✓';
                
                // Signal ready to React Native
                setTimeout(() => {
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'chartReady'
                        }));
                    }
                }, 100);
            }
            
            // Start the render process
            document.addEventListener('DOMContentLoaded', waitForD3AndRender);
            setTimeout(waitForD3AndRender, 100);
            
        </script>
    </body>
    </html>`;
  }, [data, size, strokeWidth, d3AssetUri]);

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: 'transparent' }]}>
      {htmlContent ? (
        <WebView
          key={`${size}-${data.length}-${d3AssetUri ? 'loaded' : 'loading'}`}
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadEnd={() => setWebViewLoaded(true)}
          javaScriptEnabled={true}
          scrollEnabled={false}
          originWhitelist={['*']}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}
      
      {/* Modal overlay for archetype info */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <View style={[styles.colorIndicator, { backgroundColor: selectedArchetype?.color }]} />
            <Text style={styles.modalTitle}>{selectedArchetype?.name}</Text>
            <Text style={styles.modalPercentage}>{selectedArchetype?.value}%</Text>
            {selectedArchetype?.description && (
              <Text style={styles.modalDescription}>{selectedArchetype.description}</Text>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              {onSegmentPress && (
                <TouchableOpacity style={styles.detailButton} onPress={navigateToDetail}>
                  <Text style={styles.detailButtonText}>More Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  modalPercentage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  detailButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  detailButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default D3DonutChart;