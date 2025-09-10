import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const D3DonutChart = ({
  data = [],
  size = 200,
  strokeWidth = 30,
  onSegmentPress = null
}) => {
  const webViewRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);

  // Post data to WebView
  useEffect(() => {
    console.log('D3DonutChart received data:', data);
    if (webViewRef.current && data.length > 0 && webViewLoaded) {
      const chartData = data.map(item => ({
        name: item.name || item.archetype,
        value: item.percentage, // Use percentage for chart calculation
        score: item.score,
        color: item.color || '#8B008B',
        isPrimary: item.isPrimary || false,
        isSecondary: item.isSecondary || false
      }));

      console.log('Sending chart data to WebView:', chartData);
      const message = JSON.stringify({
        type: 'update',
        payload: chartData
      });
      
      webViewRef.current.postMessage(message);
    }
  }, [data, size, strokeWidth, webViewLoaded]);

  const handleSingleClick = (data) => {
    setSelectedArchetype(data);
    setModalVisible(true);
  };

  const handleDoubleClick = (data) => {
    if (onSegmentPress) {
      onSegmentPress(data);
    }
  };

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'segmentClick') {
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          setClickTimeout(null);
          handleDoubleClick(message.data);
        } else {
          const timeout = setTimeout(() => {
            handleSingleClick(message.data);
            setClickTimeout(null);
          }, 300); // 300ms delay to distinguish single from double click
          setClickTimeout(timeout);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const htmlContent = useMemo(() => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, svg {
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: transparent;
            }
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .arc-path {
                cursor: pointer;
                transition: filter 0.2s ease-in-out;
            }
            .arc-path:hover {
                filter: brightness(1.15);
            }
        </style>
    </head>
    <body>
        <div id="chart"></div>
        <script>
            let chartData = [];
            const size = ${size};
            const strokeWidth = ${strokeWidth};
            
            // Wait for D3 to load
            function initChart() {
                if (typeof d3 === 'undefined') {
                    console.log('D3 not loaded yet, retrying...');
                    setTimeout(initChart, 100);
                    return;
                }
                
                console.log('D3 loaded, initializing chart');
                const svg = d3.select('#chart').append('svg').attr('width', size).attr('height', size);
                const g = svg.append('g').attr('transform', 
                    \`translate(\${size/2}, \${size/2})\`);
                
                window.chartGroup = g; // Store reference for updates
            }
            
            function updateChart() {
                console.log('updateChart called with data:', chartData);
                if (!chartData.length) {
                    console.log('No chart data available');
                    return;
                }
                
                if (!window.chartGroup) {
                    console.log('Chart group not initialized yet');
                    return;
                }

                const radius = size / 2;
                const innerRadius = radius - strokeWidth;
                const outerRadius = radius - 10;

                const pie = d3.pie().value(d => d.value).sort(null);
                const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(2);

                const arcs = window.chartGroup.selectAll('.arc').data(pie(chartData));

                arcs.exit().remove();

                const arcEnter = arcs.enter().append('g').attr('class', 'arc');
                arcEnter.append('path').attr('class', 'arc-path');

                const arcUpdate = arcEnter.merge(arcs);
                
                arcUpdate.select('path')
                    .attr('d', arc)
                    .attr('fill', d => d.data.color)
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', 1.5)
                    .on('click', function(event, d) {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'segmentClick',
                                data: d.data
                            }));
                        }
                    });
                    
                console.log('Chart updated successfully');
            }

            window.addEventListener('message', e => {
                console.log('WebView received message:', e.data);
                const message = JSON.parse(e.data);
                if (message.type === 'update') {
                    console.log('Updating chart with data:', message.payload);
                    chartData = message.payload;
                    updateChart();
                }
            });
            
            // Initialize chart when page loads
            initChart();
        </script>
    </body>
    </html>`;
  }, [size, strokeWidth]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoad={() => {
          console.log('WebView loaded');
          setWebViewLoaded(true);
        }}
        javaScriptEnabled={true}
        scrollEnabled={false}
        originWhitelist={['*']}
        bounces={false}
      />
      {selectedArchetype && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedArchetype.name}</Text>
              <Text style={styles.modalPercentage}>{selectedArchetype.value}%</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalPercentage: {
    fontSize: 16,
    marginTop: 5,
  },
});

export default D3DonutChart;
