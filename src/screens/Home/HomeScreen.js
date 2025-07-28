import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.homeContainer}>
          {/* Header */}
          <Text style={styles.headerTitle}>HI LUCIEN!</Text>
          
          {/* Begin Derive CTA */}
          <TouchableOpacity onPress={() => navigation.navigate('Derive')}>
            <Text style={styles.linkText}>BEGIN YOUR DERIVE NOW &gt;</Text>
          </TouchableOpacity>

          {/* Aesthetic Profile Section */}
          <TouchableOpacity style={styles.section}>
            <Text style={styles.sectionTitle}>AESTHETIC PROFILE &gt;</Text>
            <View style={styles.pieChartPlaceholder} />
            <Text style={styles.pieChartLabel}>ART DECO 44%</Text>
          </TouchableOpacity>

          {/* Past Walks Section */}
          <TouchableOpacity style={styles.section}>
            <Text style={styles.sectionTitle}>PAST WALKS &gt;</Text>
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>A Walk Through SoHo's Cast-Iron District</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>Midtown's Modernist Marvels</Text>
            </View>
          </TouchableOpacity>

          {/* Featured Landmark Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURED LANDMARK</Text>
            <View style={styles.featuredCard}>
                <View style={styles.featuredImagePlaceholder} />
                <Text style={styles.featuredTitle}>The Flatiron Building</Text>
                <Text style={styles.featuredSubtitle}>A true icon of New York architecture.</Text>
                <TouchableOpacity>
                    <Text style={styles.linkTextSmall}>MORE INFO</Text>
                </TouchableOpacity>
            </View>
          </View>
          
          {/* Extra content to ensure scrolling */}
           <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXPLORE STYLES</Text>
            <View style={styles.featuredCard}>
                <Text style={styles.featuredTitle}>Brutalism</Text>
                <Text style={styles.featuredSubtitle}>Raw, honest, and powerful forms.</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollView: { flex: 1 },
  homeContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }, // paddingBottom to avoid overlap with tab bar
  headerTitle: { color: '#000', fontSize: 28, fontWeight: 'bold', letterSpacing: 1 },
  linkText: { color: '#000', fontSize: 16, fontWeight: 'bold', marginTop: 8, letterSpacing: 0.5 },
  linkTextSmall: { color: '#000', fontSize: 14, fontWeight: 'bold', marginTop: 12 },
  section: { marginTop: 40 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  pieChartPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#e0e0e0', alignSelf: 'center' },
  pieChartLabel: { color: '#000', alignSelf: 'center', marginTop: 8, fontWeight: '500' },
  listItem: { paddingVertical: 15, borderTopWidth: 1, borderColor: '#e0e0e0' },
  listItemText: { color: '#000', fontSize: 16 },
  featuredCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  featuredImagePlaceholder: { height: 150, backgroundColor: '#e0e0e0', borderRadius: 8 },
  featuredTitle: { color: '#000', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  featuredSubtitle: { color: '#555', fontSize: 14, marginTop: 4 },
});

export default HomeScreen; 