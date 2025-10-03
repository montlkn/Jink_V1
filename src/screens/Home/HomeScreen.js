import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AestheticProfile from '../../components/home/AestheticProfile';
import QuestCard from '../../components/quests/QuestCard';
import QuestDetailModal from '../../components/quests/QuestDetailModal';
import { getTimeUntilMidnight, getTimeUntilMonday } from '../../utils/questTimers';
import { getActiveDailyQuest, getActiveWeeklyQuest } from '../../services/questService';

const HomeScreen = ({ navigation }) => {
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dailyTimeRemaining, setDailyTimeRemaining] = useState('');
  const [weeklyTimeRemaining, setWeeklyTimeRemaining] = useState('');
  const [dailyQuest, setDailyQuest] = useState(null);
  const [weeklyQuest, setWeeklyQuest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load quests from Supabase
  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const [daily, weekly] = await Promise.all([
        getActiveDailyQuest(),
        getActiveWeeklyQuest()
      ]);

      if (daily) {
        setDailyQuest({
          type: 'daily',
          questType: daily.quest_type,
          title: daily.title,
          description: daily.description,
          xpReward: daily.xp_reward,
          additionalRewards: (daily.rewards?.stamps || []).map(stamp => ({
            type: 'stamp',
            icon: 'bookmark',
            label: stamp
          })).concat((daily.rewards?.achievements || []).map(achievement => ({
            type: 'achievement',
            icon: 'ribbon',
            label: achievement
          }))),
          progress: daily.progress || 0,
          total: daily.target_count,
          completed: daily.completed || false
        });
      }

      if (weekly) {
        setWeeklyQuest({
          type: 'weekly',
          questType: weekly.quest_type,
          title: weekly.title,
          description: weekly.description,
          xpReward: weekly.xp_reward,
          additionalRewards: (weekly.rewards?.stamps || []).map(stamp => ({
            type: 'stamp',
            icon: 'bookmark',
            label: stamp
          })).concat((weekly.rewards?.achievements || []).map(achievement => ({
            type: 'achievement',
            icon: 'ribbon',
            label: achievement
          }))),
          progress: weekly.progress || 0,
          total: weekly.target_count,
          completed: weekly.completed || false
        });
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update timers
  useEffect(() => {
    const updateTimers = () => {
      setDailyTimeRemaining(getTimeUntilMidnight().formatted);
      setWeeklyTimeRemaining(getTimeUntilMonday().formatted);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleQuestPress = (quest) => {
    setSelectedQuest(quest);
    setModalVisible(true);
  };

  const handleStartQuest = (screen) => {
    navigation.navigate(screen);
  };

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
          <View style={styles.section}>
            <AestheticProfile
              navigation={navigation}
              onNavigate={() => navigation.navigate('ProfileDetail')}
            />
          </View>

          {/* Daily Quest Section */}
          {dailyQuest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TODAY'S QUEST</Text>
              <QuestCard
                type="daily"
                title={dailyQuest.title}
                description={dailyQuest.description}
                xpReward={dailyQuest.xpReward}
                additionalRewards={dailyQuest.additionalRewards}
                progress={dailyQuest.progress}
                total={dailyQuest.total}
                completed={dailyQuest.completed}
                onPress={() => handleQuestPress(dailyQuest)}
              />
            </View>
          )}

          {/* Weekly Quest Section */}
          {weeklyQuest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>THIS WEEK'S CHALLENGE</Text>
              <QuestCard
                type="weekly"
                title={weeklyQuest.title}
                description={weeklyQuest.description}
                xpReward={weeklyQuest.xpReward}
                additionalRewards={weeklyQuest.additionalRewards}
                progress={weeklyQuest.progress}
                total={weeklyQuest.total}
                completed={weeklyQuest.completed}
                onPress={() => handleQuestPress(weeklyQuest)}
              />
            </View>
          )}

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

        </View>
      </ScrollView>

      {/* Quest Detail Modal */}
      <QuestDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        quest={selectedQuest}
        onStartQuest={handleStartQuest}
        timeRemaining={selectedQuest?.type === 'daily' ? dailyTimeRemaining : weeklyTimeRemaining}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollView: { flex: 1 },
  homeContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }, // paddingBottom to avoid overlap with tab bar
  headerTitle: { color: '#000', fontSize: 28, fontWeight: 'bold', letterSpacing: 1 },
  linkText: { color: '#000', fontSize: 16, fontWeight: 'bold', marginTop: 8, letterSpacing: 0.5 },
  section: { marginTop: 40 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  listItem: { paddingVertical: 15, borderTopWidth: 1, borderColor: '#e0e0e0' },
  listItemText: { color: '#000', fontSize: 16 },
});

export default HomeScreen; 