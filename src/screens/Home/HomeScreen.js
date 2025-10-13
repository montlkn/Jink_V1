import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import AestheticProfile from '../../components/home/AestheticProfile';
import XPMeter from '../../components/passport/XPMeter';
import QuestCard from '../../components/quests/QuestCard';
import QuestDetailModal from '../../components/quests/QuestDetailModal';
import { getActiveDailyQuest, getActiveWeeklyQuest, getUserXP, getXPForNextLevel } from '../../services/questService';
import { getTimeUntilMidnight, getTimeUntilMonday } from '../../utils/questTimers';
import { useAuth } from '../../auth/authProvider';
import { getUserAestheticProfile } from '../../api/quizApi';

const HomeScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dailyTimeRemaining, setDailyTimeRemaining] = useState('');
  const [weeklyTimeRemaining, setWeeklyTimeRemaining] = useState('');
  const [dailyQuest, setDailyQuest] = useState(null);
  const [weeklyQuest, setWeeklyQuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevel, setXpForNextLevel] = useState(100);
  const [archetypeData, setArchetypeData] = useState(null);

  // Load quests from Supabase
  useEffect(() => {
    loadQuests();
  }, []);

  // Load user's aesthetic profile and prepare orb data
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        setArchetypeData(null);
        return;
      }
      try {
        const profile = await getUserAestheticProfile(session.user.id);
        if (profile?.archetype_scores) {
          // Transform map -> array for orb util
          const arr = Object.entries(profile.archetype_scores).map(([key, score]) => ({
            name: key, // util maps ids to display names/colors
            score: typeof score === 'number' ? score : 0,
          }));
          setArchetypeData(arr);
        } else {
          setArchetypeData(null);
        }
      } catch (e) {
        console.warn('Home: failed to load aesthetic profile', e);
        setArchetypeData(null);
      }
    };
    loadProfile();
  }, [session?.user?.id]);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const [daily, weekly, xpData] = await Promise.all([
        getActiveDailyQuest(),
        getActiveWeeklyQuest(),
        getUserXP()
      ]);

      // Set XP data
      setUserXP(xpData.xp);
      setUserLevel(xpData.level);
      setXpForNextLevel(getXPForNextLevel(xpData.level));

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
      <ScrollView style={styles.scrollView} removeClippedSubviews={false}>
        <View style={styles.homeContainer}>

          {/* Aesthetic Profile Section */}
          <View style={styles.section}>
            <AestheticProfile
              navigation={navigation}
              onNavigate={() => navigation.navigate('ProfileDetail')}
              archetypeData={archetypeData}
            />
          </View>
          
          {/* XP Meter */}
          <View style={styles.xpSection}>
            <XPMeter
              currentXP={userXP}
              level={userLevel}
              xpForNextLevel={xpForNextLevel}
            />
          </View>

          {/* Daily Quest Section */}
          {dailyQuest && (
            <View style={styles.section}>
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
  homeContainer: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 100 }, // paddingBottom to avoid overlap with tab bar
  listItemText: { color: '#000', fontSize: 16 },
  xpSection: { marginTop: 24, marginBottom: 0 },
});

export default HomeScreen; 
